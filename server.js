"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./prisma/index"));
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const saltRounds = 10;
const port = process.env.PORT || 3000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const sockets = new socket_io_1.Server(server, {
    cors: {
        // origin: "https://my-frontend.com",
        // or with an array of origins
        origin: [
            "https://https://market-api-0ncd.onrender.com",
            "https://market-api-0ncd.onrender.com/chat",
            "http://localhost:3000",
            "http://localhost:8081"
        ],
    }
});
app.use(express_1.default.static('public'));
app.use(express_1.default.json());
sockets.on('connection', (socket) => {
    let roomsConnected;
    let _userId;
    socket.on("createUser", (data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { password, username } = data;
            let newUser;
            yield index_1.default.$connect();
            let usersFind = yield index_1.default.users.findUnique({ where: { username } });
            if (!usersFind) {
                bcrypt_1.default.genSalt(saltRounds, function (err, salt) {
                    bcrypt_1.default.hash(password, salt, function (err, hash) {
                        return __awaiter(this, void 0, void 0, function* () {
                            // Store hash in your password DB.
                            newUser = yield index_1.default.users.create({
                                data: {
                                    username,
                                    password: hash,
                                    clientID: socket.id,
                                    status: "offline",
                                }
                            });
                            socket.emit("successCreateNewUser", { id: newUser.id, username, password });
                        });
                    });
                });
            }
            else {
                return socket.emit("roomError", "User already exists");
            }
        }
        catch (error) {
            socket.emit("roomError", error);
            console.log(error);
        }
        finally {
            yield index_1.default.$disconnect();
        }
    }));
    socket.on("requestUserList", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield index_1.default.$connect();
            let users = yield index_1.default.users.findMany();
            let usersFilter = users.filter(({ clientID }) => clientID != socket.id);
            socket.emit("userList", usersFilter);
        }
        catch (error) {
            socket.emit("roomError", error);
            console.log(error);
        }
        finally {
            yield index_1.default.$disconnect();
        }
    }));
    socket.on("requestEnterCHAT", (_a) => __awaiter(void 0, [_a], void 0, function* ({ room, passwordRoom, id, username, password }) {
        try {
            yield index_1.default.$connect();
            let user;
            if (id)
                user = yield index_1.default.users.findUnique({ where: { id } });
            else
                user = yield index_1.default.users.findUnique({ where: { username } });
            if (user) {
                bcrypt_1.default.compare(password, user.password, function (err, result) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (result) {
                            socket.join("CHAT");
                            socket.emit("successEnterRoom", {
                                success: true, user: {
                                    username,
                                    password,
                                    id: user.id
                                }
                            });
                            _userId = user.id;
                            yield index_1.default.users.update({ where: { id: user.id }, data: { status: "online", clientID: socket.id } });
                            let users = yield index_1.default.users.findMany();
                            sockets.to('CHAT').emit("userList", users);
                            roomsConnected = socket.rooms.size;
                        }
                        else {
                            socket.emit("roomError", "User password incorrect");
                        }
                    });
                });
            }
            else {
                socket.emit("roomError", "User doesn't exist");
            }
        }
        catch (error) {
            socket.emit("roomError", error);
            console.log(error);
        }
        finally {
            yield index_1.default.$disconnect();
        }
    }));
    socket.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
        socket.to("CHAT").emit(data.to, data);
    }));
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield index_1.default.$connect();
            if (roomsConnected > 1) {
                socket.leave("CHAT");
                yield index_1.default.users.update({ where: { id: _userId }, data: { status: "offline" } });
                let users = yield index_1.default.users.findMany();
                sockets.to('CHAT').emit("userList", users);
            }
        }
        catch (error) {
            socket.emit("roomError", error);
            console.log(error);
        }
        finally {
            yield index_1.default.$disconnect();
        }
    }));
});
app.get("/chat/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.$connect();
        const id = req.params.id;
        let messages = yield index_1.default.messages.findMany({ where: { chatId: id } });
        return res.json(messages);
    }
    catch (error) {
        console.log(error);
        return res.json({ success: false, error });
    }
    finally {
        yield index_1.default.$disconnect();
    }
}));
app.get("/chat/:idFrom/:idTo", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.$connect();
        const idFrom = req.params.idFrom;
        const idTo = req.params.idTo;
        function findChatId() {
            return __awaiter(this, void 0, void 0, function* () {
                let chatId = yield index_1.default.chats.findMany({ where: { user_one: idFrom, user_two: idTo } });
                if (chatId.length > 0) {
                    return chatId[0].id;
                }
                else {
                    chatId = yield index_1.default.chats.findMany({ where: { user_one: idTo, user_two: idFrom } });
                    if (chatId.length > 0) {
                        return chatId[0].id;
                    }
                    else {
                        return null;
                    }
                }
            });
        }
        let chatId = yield findChatId();
        if (chatId) {
            let messages = yield index_1.default.messages.findMany({ where: { chatId: chatId } });
            return res.json(messages);
        }
        else
            return res.json(null);
    }
    catch (error) {
        console.log(error);
        return res.json({ success: false, error });
    }
    finally {
        yield index_1.default.$disconnect();
    }
}));
app.get("/villagers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.$connect();
        let villagers = yield index_1.default.villagers.findMany();
        return res.status(200).json({ classes: villagers[0].classes });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
    finally {
        yield index_1.default.$disconnect();
    }
}));
app.post('/audio-message', express_1.default.raw({ type: 'application/octet-stream' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.$connect();
        const { from, to, audioData, type, username } = req.body;
        function findChatId() {
            return __awaiter(this, void 0, void 0, function* () {
                let chatId = yield index_1.default.chats.findMany({ where: { user_one: from, user_two: to } });
                if (chatId.length > 0) {
                    return chatId[0].id;
                }
                else {
                    chatId = yield index_1.default.chats.findMany({ where: { user_one: to, user_two: from } });
                    if (chatId.length > 0) {
                        return chatId[0].id;
                    }
                    else {
                        let createChatId = yield index_1.default.chats.create({
                            data: {
                                user_one: from,
                                user_two: to,
                            }
                        });
                        return createChatId.id;
                    }
                }
            });
        }
        let chatId = yield findChatId();
        let messageData = {
            from,
            to,
            type,
            username,
            chatId,
            audioData
        };
        const message = yield index_1.default.messages.create({
            data: messageData,
        });
        return res.status(200).json({ id: message.id });
    }
    catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        return res.status(500).send('Erro ao salvar mensagem.');
    }
    finally {
        yield index_1.default.$disconnect();
    }
}));
app.post("/messages", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield index_1.default.$connect();
        const { from, to, message, type, username } = req.body;
        let dataCreate = {
            from,
            to,
            message,
            type,
            username,
        };
        function findChatId() {
            return __awaiter(this, void 0, void 0, function* () {
                let chatId = yield index_1.default.chats.findMany({ where: { user_one: from, user_two: to } });
                if (chatId.length > 0) {
                    return chatId[0].id;
                }
                else {
                    chatId = yield index_1.default.chats.findMany({ where: { user_one: to, user_two: from } });
                    if (chatId.length > 0) {
                        return chatId[0].id;
                    }
                    else {
                        let createChatId = yield index_1.default.chats.create({
                            data: {
                                user_one: from,
                                user_two: to,
                            }
                        });
                        return createChatId.id;
                    }
                }
            });
        }
        let chatId = yield findChatId();
        let chat = yield index_1.default.messages.create({ data: Object.assign(Object.assign({}, dataCreate), { chatId: chatId }) });
        return res.status(201).json({
            message: 'User created successfully!',
            id: chat.chatId,
            success: true
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            error: 'Server Error.'
        });
    }
    finally {
        yield index_1.default.$disconnect();
    }
}));
server.listen(port, () => {
    console.log(`Server is running`);
});
