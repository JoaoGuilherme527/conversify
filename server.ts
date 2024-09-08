import express, { Express, Request, Response } from "express";
import http from 'http';
import helmet from "helmet"
import bcrypt from "bcrypt"
import dotenv from "dotenv";
import prisma from "./prisma/index";
import path from "path";
import { Server } from "socket.io";
import { messages } from "@prisma/client";
import puppeteer from "puppeteer";

dotenv.config();

const saltRounds = 10;
const port = process.env.PORT || 3000;
const app: Express = express();
const server = http.createServer(app);
const sockets = new Server(server, {
  cors: {
    // origin: "https://my-frontend.com",
    // or with an array of origins
    origin: [
      "https://conversify-wvae.onrender.com/",
      "https://conversify-wvae.onrender.com/chat",
      "https://conversify-wvae.onrender.com/ranking",
      "http://localhost:3000",
      "http://localhost:8081"],
  }
});

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }))

sockets.on('connection', (socket) => {
  let roomsConnected: any
  let _userId: string

  socket.on("createUser", async (data) => {
    try {
      const { password, username } = data;

      let newUser
      await prisma.$connect()

      let usersFind = await prisma.users.findUnique({ where: { username } })

      if (!usersFind) {
        bcrypt.genSalt(saltRounds, function (err, salt) {
          bcrypt.hash(password, salt, async function (err, hash) {
            // Store hash in your password DB.
            newUser = await prisma.users.create({
              data: {
                username,
                password: hash,
                clientID: socket.id,
                status: "offline",
              }
            })

            socket.emit("successCreateNewUser", { id: newUser.id, username, password })
          });
        });
      } else {
        return socket.emit("roomError", "User already exists")

      }
    } catch (error: any) {
      socket.emit("roomError", error)
      console.log(error);
    }
    finally {
      await prisma.$disconnect()
    }
  })

  socket.on("requestUserList", async () => {
    try {
      await prisma.$connect()
      let users = await prisma.users.findMany()
      let usersFilter = users.filter(({ clientID }) => clientID != socket.id)
      socket.emit("userList", usersFilter)
    } catch (error) {
      socket.emit("roomError", error)
      console.log(error);

    } finally {
      await prisma.$disconnect()
    }
  })

  socket.on("requestEnterCHAT", async ({ room, passwordRoom, id, username, password }) => {
    try {
      await prisma.$connect()
      let user

      if (id) user = await prisma.users.findUnique({ where: { id } })
      else user = await prisma.users.findUnique({ where: { username } })

      if (user) {
        bcrypt.compare(password, user.password, async function (err, result) {
          if (result) {
            socket.join("CHAT")
            socket.emit("successEnterRoom", {
              success: true, user: {
                username,
                password,
                id: user.id
              }
            })
            _userId = user.id
            await prisma.users.update({ where: { id: user.id }, data: { status: "online", clientID: socket.id } })
            let users = await prisma.users.findMany()
            sockets.to('CHAT').emit("userList", users)
            roomsConnected = socket.rooms.size
          } else {
            socket.emit("roomError", "User password incorrect")
          }
        });
      } else {
        socket.emit("roomError", "User doesn't exist")
      }

    } catch (error) {
      socket.emit("roomError", error)
      console.log(error);
    } finally {
      await prisma.$disconnect()
    }
  })

  socket.on('message', async (data) => {
    socket.to("CHAT").emit(data.to, data)
  });

  socket.on("disconnect", async () => {
    try {
      await prisma.$connect()
      if (roomsConnected > 1) {
        socket.leave("CHAT")

        await prisma.users.update({ where: { id: _userId }, data: { status: "offline" } })

        let users = await prisma.users.findMany()
        sockets.to('CHAT').emit("userList", users)
      }
    } catch (error) {
      socket.emit("roomError", error)
      console.log(error);
    } finally {
      await prisma.$disconnect()
    }
  })
});

app.get("/chat/:id", async (req: Request, res: Response) => {
  try {
    await prisma.$connect()
    const id = req.params.id;

    let messages = await prisma.messages.findMany({ where: { chatId: id } })
    return res.json(messages)


  } catch (error) {
    console.log(error);
    return res.json({ success: false, error })
  } finally {
    await prisma.$disconnect()
  }
})

app.get("/chat/:idFrom/:idTo", async (req: Request, res: Response) => {
  try {
    await prisma.$connect()
    const idFrom = req.params.idFrom
    const idTo = req.params.idTo;

    async function findChatId() {
      const chat = await prisma.chats.findFirst({
        where: {
          OR: [
            { user_one: idFrom, user_two: idTo },
            { user_one: idTo, user_two: idFrom }
          ]
        }
      });

      return chat ? chat.id : null;
    }

    let chatId = await findChatId()

    if (chatId) {
      const messages = await prisma.messages.findMany({
        where: { chatId: chatId as string },
        orderBy: { created_at: 'asc' }
      });

      return res.json(messages)

    } else return res.json(null)

  } catch (error) {
    console.log(error);
    return res.json({ success: false, error })
  } finally {
    await prisma.$disconnect()
  }
})


app.get("/villagers", async (req: Request, res: Response) => {
  try {
    await prisma.$connect()
    let villagers = await prisma.villagers.findMany()

    return res.status(200).json({ classes: villagers[0].classes })


  } catch (error) {

    console.log(error);
    return res.status(500).json({ message: "Server Error" })
  } finally {
    await prisma.$disconnect()
  }
});

app.post("/messages", async (req: Request, res: Response) => {
  try {
    await prisma.$connect()
    const { from, to, message, type, username } = req.body;
    const audio = req.body

    let dataCreate = {
      from,
      to,
      message,
      type,
      username,
    }

    if (audio) {
      const audioData = req.body
      Object.assign(dataCreate, audioData)
    }

    async function findChatId() {

      let chatId = await prisma.chats.findMany({ where: { user_one: from, user_two: to } })
      if (chatId.length > 0) {
        return chatId[0].id
      } else {
        chatId = await prisma.chats.findMany({ where: { user_one: to, user_two: from } })
        if (chatId.length > 0) {
          return chatId[0].id
        } else {
          let createChatId = await prisma.chats.create({
            data: {
              user_one: from,
              user_two: to,
            }
          })
          return createChatId.id
        }
      }
    }

    let chatId = await findChatId()
    let chat = await prisma.messages.create({ data: { ...dataCreate, chatId: chatId as string } })
    return res.status(201).json({
      message: 'User created successfully!',
      data: chat,
      success: true
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: 'Server Error.'
    });
  } finally {
    await prisma.$disconnect()
  }
})

app.get("/ranking", async (req: Request, res: Response) => {
  try {
    const browser = await puppeteer.launch()
    let page = await browser.newPage()
    await page.goto("https://www.fundsexplorer.com.br/ranking", { waitUntil: "load" })

    const funds = await page.evaluate(() => {
      const data: { fundName: string, currentPrice: string, dividendYield: string, priceChange: string }[] = []
      const rows = document.querySelectorAll("tbody.default-fiis-table__container__table__body tr")

      rows.forEach((row: any) => {
        const fundName = row.querySelector('td[data-collum="collum-post_title"] a')?.textContent.trim() || "N/A"
        const currentPrice = row.querySelector('td[data-collum="collum-valor"]')?.textContent.trim() || "N/A"
        const dividendYield = row.querySelector('td[data-collum="collum-yeld"]')?.textContent.trim() || "N/A"
        const priceChange = row.querySelector('td[data-collum="collum-variacao_cotacao_mes"]')?.textContent.trim() || "N/A"

        if (currentPrice !== "N/A") {
          data.push({ fundName, currentPrice, dividendYield, priceChange })
        }
      })

      return data
    })

    await browser.close()
    res.status(201).json(funds)
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.get("/ranking/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const browser = await puppeteer.launch()
    let page = await browser.newPage()
    await page.goto("https://www.fundsexplorer.com.br/ranking", { waitUntil: "load" })

    const funds = await page.evaluate(() => {
      const data: { fundName: string, currentPrice: string, dividendYield: string, priceChange: string }[] = []
      const rows = document.querySelectorAll("tbody.default-fiis-table__container__table__body tr")

      rows.forEach((row: any) => {
        const fundName = row.querySelector('td[data-collum="collum-post_title"] a')?.textContent.trim() || "N/A"
        const currentPrice = row.querySelector('td[data-collum="collum-valor"]')?.textContent.trim() || "N/A"
        const dividendYield = row.querySelector('td[data-collum="collum-yeld"]')?.textContent.trim() || "N/A"
        const priceChange = row.querySelector('td[data-collum="collum-variacao_cotacao_mes"]')?.textContent.trim() || "N/A"

        if (currentPrice !== "N/A") {
          let newData = { fundName, currentPrice, dividendYield, priceChange }
          data.push(newData)
        }
      })

      return data
    })

    await browser.close()
    res.status(201).json(funds.filter(({ fundName }) => fundName == name.toUpperCase()))
  } catch (error) {
    res.status(500).json({ error })
  }
})

server.listen(port, () => {
  console.log(`Server is running 🚀`);
});