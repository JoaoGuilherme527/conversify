import { Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events"

interface User{
    clientId: string, 
    username: string,
    status: "online" | "offline"
}

export default function createManager() {
    let users: any[] = new Array()

    function addUser(user: any) {
        users.push(user)
    }

    function getUserList() {
        if (!users) return
        return users
    }

    function turnOfflineUser(user: any) {
        let newUserList = users.filter(
            (client) => client.clientId !== user.clientId
        )
        newUserList.push(user)
        users = newUserList
    }

    function turnOnlineUser(user: any) {
        let newUserList = users.filter(
            (client) => client.clientId !== user.clientId
        )
        newUserList.push(user)
        users = newUserList
    }

    function getUserName(clientId:string) {
        let username = users.filter((user) => user.clientId === clientId)
        return username ? username[0].username : null
    }

    function emptyUserList() {
        users = new Array()
    }

    return {
        addUser,
        getUserList,
        turnOfflineUser,
        emptyUserList,
        getUserName,
        turnOnlineUser
    }
}