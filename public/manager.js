"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createManager;
function createManager() {
    let users = new Array();
    function addUser(user) {
        users.push(user);
    }
    function getUserList() {
        if (!users)
            return;
        return users;
    }
    function turnOfflineUser(user) {
        let newUserList = users.filter((client) => client.clientId !== user.clientId);
        newUserList.push(user);
        users = newUserList;
    }
    function turnOnlineUser(user) {
        let newUserList = users.filter((client) => client.clientId !== user.clientId);
        newUserList.push(user);
        users = newUserList;
    }
    function getUserName(clientId) {
        let username = users.filter((user) => user.clientId === clientId);
        return username ? username[0].username : null;
    }
    function emptyUserList() {
        users = new Array();
    }
    return {
        addUser,
        getUserList,
        turnOfflineUser,
        emptyUserList,
        getUserName,
        turnOnlineUser
    };
}
