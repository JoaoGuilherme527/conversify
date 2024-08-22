const socket = io()
const userList = document.getElementById("clientsList")
const toUserName = document.getElementById("toUserName")
// const roomInput = document.getElementById("roomInput")
// const roomPasswordInput = document.getElementById("roomPasswordInput")
const userNameInput = document.getElementById("userNameInput")
const userPasswordInput = document.getElementById("userPasswordInput")
const enterRoomButton = document.getElementById("enterRoomButton")
const postNewUser = document.getElementById("postNewUser")
const chatOffScreen = document.querySelector(".chatOffScreen")
const chatWrapper = document.querySelector(".chatWrapper")
const input = document.getElementById("messageInput")
const newUserButton = document.querySelector("#newUserButton")
const backButton = document.querySelector("#backButton")
const userNameCreate = document.getElementById("userNameCreate")
const userPasswordCreate = document.getElementById("userPasswordCreate")
const userPasswordConfirm = document.getElementById("userPasswordConfirm")

const form = document.getElementById("form")
const formCreate = document.getElementById("formCreate")

var menu = document.querySelector("#menu")
var chatImage = document.querySelector("#chatImage")
var sideButtons = document.querySelector(".sideButtons")
var sideBar = document.querySelector(".sideBar")
var isOpen = false
var isListOpen = true
var path = location.href

let username
let _userId
let toUserId

function CloseOpenSideBar() {
    isListOpen = !isListOpen
    if (!isListOpen) {
        sideBar.classList.add("sideBarOpen")
    } else {
        sideBar.classList.remove("sideBarOpen")
    }
}

function ValidatePassword() {
    if (userPasswordConfirm.value === userPasswordCreate.value) {
        userPasswordConfirm.style = "border: 1px solid var(--light-grey);"
        postNewUser.removeAttribute("disabled")
        return true
    } else {
        userPasswordConfirm.style = "border: 1px solid #f00;"
        postNewUser.setAttribute("disabled", true)
        return false
    }
}

function fragmentFromString(strHTML) {
    return document.createRange().createContextualFragment(strHTML)
}

function formatCreatedAt(createdAt) {
    const date = new Date(createdAt)
    const now = new Date()

    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString()

    if (isToday) {
        return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
    } else if (isYesterday) {
        return "Ontem"
    } else {
        return date.toLocaleDateString([], {day: "2-digit", month: "2-digit", year: "numeric"})
    }
}

async function CreateChatElement(user) {
    const chat = document.getElementById("chat")
    const messageDiv = document.createElement("div")
    if (user.audio) {
        const audioElement = document.createElement("audio")
        audioElement.setAttribute("controls", true)
        const audioBlob = await fetch(`data:audio/wav;base64,${user.audioData}`).then((res) => res.blob())
        const audioUrl = URL.createObjectURL(audioBlob)
        audioElement.src = audioUrl
        audioElement.setAttribute("preload", "auto")
        messageDiv.append(audioElement)
    } else {
        const messageText = document.createElement("p")
        messageText.innerText = user.message
        messageDiv.appendChild(messageText)
    }
    messageDiv.className = user.from == _userId ? "msg clientOne" : "msg"
    chat.appendChild(messageDiv)
    chat.scrollTop = chat.scrollHeight
}

function CreateUserElement(user) {
    const li = document.createElement("li")
    const divAvatar = document.createElement("div")
    const button = document.createElement("button")
    const div = document.createElement("div")
    div.setAttribute("id", "divMessage")
    div.setAttribute("dataId", user.id)
    const pName = document.createElement("p")
    li.className = user.status
    pName.innerText = user.username
    pName.className = "userName"
    divAvatar.className = "avatar"

    button.append(pName)

    button.append(div)
    li.append(divAvatar)
    li.appendChild(button)
    li.addEventListener("click", () => {
        GetChatStorage(user)
        input.focus()
        CloseOpenSideBar()
        chatOffScreen.style = "display: none;"
        chatWrapper.style = "display: block;"
        toUserId = user.id
        div.classList.remove("notSeen")
    })
    return li
}

function EnterRoom() {
    document.querySelector("#textButton").style = "display: none;"
    document.querySelector(".loader").style = "display: block;"

    if (userNameInput.value && userPasswordInput.value) {
        let user = {
            username: userNameInput.value,
            password: userPasswordInput.value,
        }
        username = userNameInput.value
        socket.emit("requestEnterCHAT", user)
        CloseOpenSideBar()
    } else {
        alert("Preencha todos os campos")

        document.querySelector("#textButton").style = "display: block;"
        document.querySelector(".loader").style = "display: none;"
    }
}

function GetChatStorage(user) {
    if (toUserId == user.id) return
    toUserId = user.id
    toUserName.innerText = user.username

    fetch(`/chat/${_userId}/${user.id}`)
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            if (data) {
                RemountChatFromStorage(data)
            } else {
                document.getElementById("chat").innerHTML = ""
            }
        })
}

async function RemountChatFromStorage(chatList) {
    document.getElementById("chat").innerHTML = ""
    let messages = chatList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    for (const message of messages) {
        await CreateChatElement(message)
    }
}

async function SendMessage(message) {
    let data = {message, to: toUserId, from: _userId, type: "sending", username}

    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    let raw = JSON.stringify(data)

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
    }

    let response = await fetch(`/messages`, requestOptions)
    let chat = await response.json()

    const formattedTime = formatCreatedAt(chat.data.created_at)
    const pMessage = document.createElement("p")
    const pReceiveTime = document.createElement("p")
    const messageText = formatMessageText(data, true)
    pMessage.innerText = messageText
    pReceiveTime.innerText = formattedTime
    const element = document.querySelector(`[dataid='${data.to}']`)
    element.innerHTML = ""
    element.append(pMessage)
    element.append(pReceiveTime)

    socket.emit("message", data)
    await CreateChatElement(data)
}

function ListUserFromStorage(list) {
    const listFiltered = list.filter((user) => user.id != _userId)

    for (const user of listFiltered) {
        const li = CreateUserElement(user)
        userList.appendChild(li)
    }
}

async function PostCreateUser() {
    let username = userNameCreate.value
    let password = userPasswordCreate.value
    socket.emit("createUser", {username, password})
    socket.on("successCreateNewUser", (data) => {
        socket.emit("requestEnterCHAT", data)
        userNameCreate.value = ""
        userPasswordCreate.value = ""
        userPasswordConfirm.value = ""
        document.getElementById("loginBox").style = "display: none;"
        document.getElementById("usernamePerfil").innerText = data.username
        document.getElementById("idPerfil").innerText = data.id
    })
}

function PostNewUser() {
    if (ValidatePassword()) {
        if (userNameCreate.value !== "") {
            if (userPasswordCreate.value !== "" && userPasswordConfirm.value !== "") {
                PostCreateUser()
            } else {
                alert("A senha nao pode estar vazia")
            }
        } else {
            alert("O nome de usuario nao pode estar vazio")
        }
    }
}

function isMobile() {
    const minWidth = 768
    return window.innerWidth < minWidth || screen.width < minWidth
}

socket.on("connect", () => {
    let storage = localStorage.getItem("USER")
    let userStorage = JSON.parse(storage)

    document.querySelector(".box").style = "display: none;"

    if (userStorage) {
        let user = {
            username: userStorage.username,
            password: userStorage.password,
            id: userStorage.id,
        }
        document.getElementById("usernamePerfil").innerText = user.username
        document.getElementById("idPerfil").innerText = user.id
        socket.emit("requestEnterCHAT", user)
        CloseOpenSideBar()
    } else {
        document.querySelector(".box").style = "display: flex;"
    }
})

socket.on("roomError", (data) => {
    if (data == "User doesn't exist") {
        var confirmUser = confirm("Este usuario nao existe deseja criar um ?")
        if (confirmUser) {
            document.querySelector("#box").style = "display: none;"
            document.querySelector("#boxCreate").style = "display: flex;"
        }
    } else {
        alert(data)
    }
})

socket.on("successEnterRoom", async (data) => {
    if (data.success) {
        _userId = data.user.id
        username = data.user.username
        document.getElementById("usernamePerfil").innerText = username
        document.getElementById("idPerfil").innerText = _userId

        document.getElementById("loginBox").style = "display: none;"
        userNameInput.value = ""
        userPasswordInput.value = ""

        localStorage.setItem("USER", JSON.stringify(data.user))

        document.querySelector("#textButton").style = "display: block;"
        document.querySelector(".loader").style = "display: none;"

        socket.on(_userId, async (message) => {
            const element = document.querySelector(`[dataid='${message.from}']`)
            if (message.audio) {
                const pMessage = document.createElement("p")
                const pReceiveTime = document.createElement("p")
                pMessage.innerText = "🎙 Audio"
                pReceiveTime.innerText = formatCreatedAt(new Date().toISOString())

                element.innerHTML = ""
                element.append(pMessage)
                element.append(pReceiveTime)
            } else {
                updateLastMessage({id: message.from})
            }
            if (toUserId === message.from) {
                await CreateChatElement(message)
            } else {
                element.classList.add("notSeen")
            }
        })
    }
})

socket.on("userList", async (data) => {
    userList.innerHTML = ""

    if (!data) return
    else {
        ListUserFromStorage(data)
        for (const user of data) {
            updateLastMessage(user)
        }
    }
})

async function updateLastMessage(user) {
    if (!user || user.id === _userId) return

    let response = await fetch(`/chat/${_userId}/${user.id}`)
    let messages = await response.json()

    if (!messages || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    const isMessageFromUser = lastMessage.to === user.id
    const formattedTime = formatCreatedAt(lastMessage.created_at)

    const pMessage = document.createElement("p")
    const pReceiveTime = document.createElement("p")

    const messageText = formatMessageText(lastMessage, isMessageFromUser)
    pMessage.innerText = messageText
    pReceiveTime.innerText = formattedTime
    const element = document.querySelector(`[dataid='${user.id}']`)

    if (element) {
        element.innerHTML = ""
        element.append(pMessage)
        element.append(pReceiveTime)
    }
}

function formatMessageText(message, isMessageFromUser) {
    const checkmk = isMessageFromUser ? "✔ " : ""
    const content = message.audio ? "🎙 Audio" : message.message

    return `${checkmk} ${content}`
}

function processFile(file) {
    console.log(file)
}

document.querySelector("#chat").addEventListener("dragover", (e) => {
    e.preventDefault()
    e.target.style = "box-shadow: inset 0px 0px 0px 1px #ffffff;border-radius: 5px;"
})

document.querySelector("#chat").addEventListener("drop", (e) => {
    e.preventDefault()
    e.target.style = "box-shadow: inset 0px 0px 0px 0px #0000;border-radius: 0px;"

    if (e.dataTransfer.items) {
        ;[...e.dataTransfer.items].forEach((item) => {
            if (item.kind === "file") {
                const file = item.getAsFile()
                processFile(file)
            }
        })
    } else {
        ;[...e.dataTransfer.files].forEach((file) => {
            processFile(file)
        })
    }
})

window.addEventListener("keypress", async (event) => {
    const message = input.value
    if (event.key == "Enter" && message !== "") {
        await SendMessage(message)
        input.value = ""
    }
})

document.onkeydown = function (evt) {
    evt = evt || window.event
    if (evt.keyCode == 27) {
        chatWrapper.style = "display: none;"
        chatOffScreen.style = "display: flex;"
        toUserId = undefined
    }
}

enterRoomButton.addEventListener("click", () => EnterRoom())

form.addEventListener("submit", (e) => {
    e.preventDefault()
})

formCreate.addEventListener("submit", (e) => {
    e.preventDefault()
})

postNewUser.addEventListener("click", () => PostNewUser())

document.getElementById("sendButton").addEventListener("click", async () => {
    const message = input.value
    if (message !== "") {
        await SendMessage(message)
        input.value = ""
    }
})

document.getElementById("sendButtonMic").addEventListener("click", async () => {
    document.getElementById("sendMicImg").style = "display:none;"
    document.getElementById("sendImg").style = "display:block;"
})

document.querySelector("#settingImage").addEventListener("mouseup", () => {
    if (isMobile()) {
        document.querySelector(".boxConfig").style = "bottom: 50%;"
    } else {
        document.querySelector(".boxConfig").style = "bottom: 5px;"
    }
})

document.querySelector(".closeConfigButton").addEventListener("mouseup", () => {
    document.querySelector(".boxConfig").style = "bottom: -550px;"
})

document.querySelector("#disconnectButton").addEventListener("click", () => {
    document.querySelector(".boxConfig").style = "bottom: -550px;"
    username = undefined
    _userId = undefined
    toUserId = undefined
    chatWrapper.style = "display: none;"
    chatOffScreen.style = "display: flex;"
    localStorage.removeItem("USER")
    document.getElementById("loginBox").style = "display: grid;"
    location.reload()
})

chatImage.addEventListener("mouseup", () => CloseOpenSideBar())

newUserButton.addEventListener("click", (e) => {
    e.preventDefault()
    document.querySelector("#box").style = "display: none;"
    document.querySelector("#boxCreate").style = "display: flex;"
})

backButton.addEventListener("click", (e) => {
    e.preventDefault()
    document.querySelector("#box").style = "display: flex;"
    document.querySelector("#boxCreate").style = "display: none;"
})

userPasswordConfirm.addEventListener("keyup", () => ValidatePassword())
userPasswordCreate.addEventListener("keyup", () => ValidatePassword())

const startButton = document.getElementById("sendButtonMic")
const audioPlayer = document.getElementById("audioPlayer")

let mediaRecorder
let audioChunks = []
let isRecording = false

async function VoiceRecord() {
    if (!isRecording) {
        document.getElementById("sendMicImg").style = "display:none;"
        document.getElementById("sendImg").style = "display:block;"
        isRecording = true
        const stream = await navigator.mediaDevices.getUserMedia({audio: true})
        mediaRecorder = new MediaRecorder(stream)

        mediaRecorder.start()

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data)
        }

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, {type: "audio/wav"})

            function blobToBase64(blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        const base64String = reader.result.split(",")[1]
                        resolve(base64String)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
            }

            blobToBase64(audioBlob).then(async (base64String) => {
                let data = {message: "", to: toUserId, from: _userId, type: "sending", username, audioData: base64String, audio: true}
                socket.emit("message", data)

                await CreateChatElement(data)
                const myHeaders = new Headers()
                myHeaders.append("Content-Type", "application/json")

                let raw = JSON.stringify(data)

                const requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: raw,
                    redirect: "follow",
                }

                let response = await fetch(`/messages`, requestOptions)
                let chat = await response.json()

                const formattedTime = formatCreatedAt(chat.data.created_at)
                const pMessage = document.createElement("p")
                const pReceiveTime = document.createElement("p")
                const messageText = formatMessageText(data, true)
                pMessage.innerText = messageText
                pReceiveTime.innerText = formattedTime
                const element = document.querySelector(`[dataid='${data.to}']`)
                element.innerHTML = ""
                element.append(pMessage)
                element.append(pReceiveTime)

                audioChunks = []
            })
        }
    } else {
        isRecording = false
        mediaRecorder.stop()
        document.getElementById("sendMicImg").style = "display:block;"
        document.getElementById("sendImg").style = "display:none;"
    }
}

startButton.addEventListener("click", async () => await VoiceRecord())
