//const server = require('http').createServer()
//const io = require('socket.io')(server)

var http = require('http');
var url = require('url');
var WebSocketServer = require('websocket').server;
const clonedeep = require('lodash.clonedeep');

var server = http.createServer( function(request, response) {
    console.log("REQUEST: " + request.url );
    var url_info = url.parse( request.url, true ); //all the request info is here
    var pathname = url_info.pathname; //the address
    var params = url_info.query; //the parameters
    response.end("OK!"); //send a response
});

server.listen(9040, function() {
    console.log("Server ready!" );
});

wsServer = new WebSocketServer({ // create the server
    httpServer: server //if we already have our HTTPServer in server variable...
});


ChatRooms = [];

wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    console.log("New user connected!");

    connection.on('message', function(message) {
        parseMessage(message, this);
    });

    connection.on('close', function(conn) {
        var username = getUserFromCon(this);
        if (username) {
            var room = getRoomUser(username);
            console.log(username + " disconnecting...");

            executeDisconnect(username);

            if (chatRoomExists(room.name)) {
                console.log("ChatRoom exists!");
                sendRoomStatus(this, room.name);
            }
        }
    });
});


function parseMessage(msg, connection) {
    console.log(msg.utf8Data);
    var message = msg.utf8Data.split("|");

    if (message.length < 1) {
        console.error("Wrongly formated message received!");
        return;
    }
    switch (message[0]) {
        case "JOIN" : {
            var connected = executeJoin(message[1], message[2], message[3], connection);
            if (connected) {
                sendRoomStatus(connection, message[1]);
            } else {
                sendError(connection, "ERROR|USER|EXISTS");
            }
            break;
        }
        case "MSG" : {
            // Store a received message in the given room
            storeMessage(message[1], message[2]);
            sendRoomStatus(connection, getRoomUser(message[1]).name);
            break;
        }
        case "WALL" : {
            if (message[1] === "PIECE") {
                var room = getRoomUser(message[2]);
                addPieceToWall(room, message[3], message[4]);
                sendRoomStatus(connection, room.name);
            } else if (message[1] === "CONFIRM") {
                var username = message[2];
                var room = getRoomUser(username);
                var user = getUser(username, room);
                setUserConfirmed(user, message[3] === "true" ? true : false);

                if (checkConfirmedWall(room)) {
                    storeFinishedWall(room, room.currentWall - 1);
                }
                sendRoomStatus(connection, room.name);

            } else {
                // Change the currentWall pointer of the given room
                changeCurrentWall(getRoomUser(message[1]), message[2]);
                sendRoomStatus(connection, getRoomUser(message[1]).name);
            }
            break;
        }
    }
}

function checkConfirmedWall(room) {
    var users = room.users;
    var numConfirmedUsers = 0;
    var isConfirmed = false;

    for (user of users) {
        if (user.confirmed) {
            numConfirmedUsers += 1;
        }
    }

    if (numConfirmedUsers === users.length) {
        isConfirmed = true;
        room.currentWall = room.currentWall + 1;
        for (user of users) {
            user.confirmed = false;
        }
    } else {
        isConfirmed = false;
    }

    return isConfirmed;
}

function storeFinishedWall(room, wallNum) {
    var finishedWall = {};
    finishedWall.users = [];
    finishedWall.wall = {};
    finishedWall.likes = 0;

    finishedWall.wall = room.walls[wallNum];

    for (user of room.users) {
        var user_finished = {};
        user_finished.name = user.name;
        user_finished.avatar = user.avatar;
        user_finished.isAdmin = user.isAdmin;
        user_finished.confirmed = user.confirmed;
        finishedWall.users.push(user_finished);
    }

    room.finishedWalls.push(finishedWall);
}

function addPieceToWall(room, elementId, piece) {
    var newDropedPiece = {};
    newDropedPiece.id = elementId.substr(4, elementId.length);
    newDropedPiece.src = piece;

    room.walls[room.currentWall].dropedPieces.push(newDropedPiece);
}

function sendError(connection, message) {
    connection.send(message);
}

function storeMessage(username, message) {
    var msg = {};
    msg.username = username;
    msg.data = message;
    // Add message to the room array
    var room = getRoomUser(username);
    room.messages.push(msg);
}

function sendRoomStatus(conn, roomname) {
    var room = getRoom(roomname);
    console.log("Sending room status to all users")
    for (user of room.users) {
        var clonedRoom = clonedeep(room);
        for (u of clonedRoom.users) {
            u.connection = null;
        }
        console.log(clonedRoom);
        user.connection.send(JSON.stringify(clonedRoom));
    }
}

function sendRoomStatusAll() {
    for (room of ChatRooms) {
        var clonedRoom = clonedeep(room);

        for (u of clonedRoom.users) {
            u.connection = null;
        }

        for (user of room.users) {
            user.connection.send(JSON.stringify(clonedRoom));
        }
    }
}

function executeJoin(chatRoom, avatar, username, connection) {
    var userAdmin = false;
    var createdChatRoom = false;
    // Create chat room if it doesn't exist
    if (!chatRoomExists(chatRoom)) {
        console.log("ChatRoom doesn't exist, let's create a new one.");
        createChatRoom(chatRoom);
        userAdmin = true;
        createdChatRoom = true;
    }
    // Join the room
    if (!userExists(username, chatRoom)) {
        addUserRoom(chatRoom, avatar, username, userAdmin, connection);
        if (createdChatRoom) {
            var numWalls = 8;
            var numHoles = 7;
            executeGenerateWalls(username, numWalls, numHoles);
            console.log("Chat room walls and holes generated!");
        }
        console.log(username + " joined the room!");
        return true;
    } else {
        console.log("User already exists!")
        return false;
    }
}

function executeDisconnect(username) {
   var room;
   if (room = getRoomUser(username)) {
        deleteUser(username, room);
        deleteRoom(room, true);
   }
}

function executeGenerateWalls(username, numWalls, numHoles) {
    var room = getRoomUser(username);
    console.log("Generating walls for the room " + room.name);

    for (var i = 0; i < numWalls; i++) {
        var wall = {};
        wall.width = Math.floor((Math.random() * 100) + 400);
        wall.height = Math.floor((Math.random() * 150) + 300);
        wall.holes = [];
        wall.dropedPieces = [];
        var holesDistanceX = Math.floor(wall.width / numHoles);
        var holesDistanceY = Math.floor(wall.height / numHoles);

        for (var h = 1; h < numHoles; h++) {
            for (var j = 1; j < numHoles; j++) {
                var hole = {};
                hole.x = wall.width - (j * holesDistanceX);
                hole.y = wall.height - (h * holesDistanceY);
                wall.holes.push(hole);
            }
        }
        room.walls.push(wall);
    }
}


function deleteRoom(chatRoom, isEmptyNeeded) {
    if (!isEmptyNeeded) {
        delete chatRoom;
        return;
    }
    if (chatRoom.users.length == 0) {
        var index = getChatRoomPos(chatRoom);
        if (index > -1) {
            ChatRooms.splice(index, 1);
        }
        delete chatRoom;
        console.log("Room deleted!");
    }
}

function deleteUser(username, chatRoom) {
    var user = getUser(username, chatRoom);
    if (!user) {
        return;
    }
    var index = -1;
    if ((index = getUserPos(user, chatRoom)) > -1) {
        chatRoom.users.splice(index, 1);
    }
}

function getUser(username, chatRoom) {
    for (user of chatRoom.users) {
        if (user.name === username) {
            return user;
        }
    }
    return null;
}

function getUserFromCon(connection) {
    for (room of ChatRooms) {
        for (user of room.users) {
            if (user.connection == connection) {
                return user.name;
            }
        }
    }
    return null;
}

function getUserPos(user, chatRoom) {
    return chatRoom.users.indexOf(user);
}

function userExists(username, chatRoom) {
    var room = getRoom(chatRoom);

    for (user of room.users) {
        if (user.name === username) {
            return true;
        }
    }
    return false;
}

function getChatRoomPos(chatRoom) {
    return ChatRooms.indexOf(chatRoom);
}
function chatRoomExists(chatRoom) {
    return getRoom(chatRoom) ? true : false;
}

function createChatRoom(chatRoom) {
    var room = new Object();
    room.name = chatRoom;
    room.currentWall = 0;
    room.users = [];
    room.sets = [];
    room.walls = [];
    room.messages = [];
    room.finishedWalls = [];
    ChatRooms.push(room);
}

function changeCurrentWall(room, index) {
    if (room) {
        room.currentWall = index;
        return true;
    }
    return false;
}

function addUserRoom(chatRoom, avatar, username, isAdmin, connection) {
    var room = null;

    if (room = getRoom(chatRoom)) {
        var user = {};
        user.name = username;
        user.avatar = avatar;
        user.isAdmin = isAdmin;
        user.confirmed = false;
        user.connection = connection;
        // Add the new user
        room.users.push(user);
    }
}

function setUserConfirmed(user, isConfirmed) {
    user.confirmed = isConfirmed;
}

function getRoom(chatRoom) {
    for (room of ChatRooms) {
        if (room.name === chatRoom) {
            return room;
        }
    }
    return null;
}

function getRoomUser(username) {
    for (room of ChatRooms) {
        if (userExists(username, room.name)) {
            return room;
        }
    }
    return null;
}