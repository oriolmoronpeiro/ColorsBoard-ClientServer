/** Client Javascript code of the Climbing Application
 * 
 * by @oriolmoron and @rogersolsona
 */

const socket = new WebSocket('wss://ecv-etic.upf.edu/node/9040/ws/');

var room = {};
var avatar;
var avatars = document.querySelector(".avatars");
var sendbtn = document.querySelector("#joinserverbtn");
var chat = document.querySelector('#msgboard');
var chatButton = document.querySelector('#goChat');
var confirmWall = document.querySelector("#goConfirm");
var galleryButton = document.querySelector("#goGallery");
var exitRoom = document.querySelector("#goBack");
var gallery = document.querySelector(".gallery_wrapper");
var sprites = document.querySelectorAll(".sprites img");
var username = "";
var roomname = "";
var logged = false;

socket.join = function(chatRoom, avatar, username){
    console.log("Received: " + chatRoom + ", " + avatar + ", " + username); //Awesome!
    this.send("JOIN|" + chatRoom + "|" + avatar + "|" + username);
}

socket.onmessage = function(msg) {
    if (isJson(msg.data)) {
        msg = JSON.parse(msg.data);
        room = msg;
        executeRefresh();
        if (checkUserExists() && !logged) {
            logged = true;
            logIn();
        }
    } else {
        msg = msg.data.split("|");
        executeError(msg);
    }
}

function drawWall(wallPosition) {
    var canvas_wrapper = document.querySelector(".canvas_wrapper");
    var canvas = document.querySelector(".canvas");
    var wall = null;

    if (canvas) {
        canvas_wrapper.removeChild(canvas);
    }

    if (arguments.length === 1) {
        wall = room.walls[wallPosition];
    } else {
        wall = room.walls[room.currentWall];
    }

    var canvas = document.createElement("div");
        // Build the canvas style
    canvas.classList.add("canvas");
    canvas.id = "canvas";
    canvas.style.width = wall.width + "px";
    canvas.style.height = wall.height + "px";
    canvas_wrapper.append(canvas);
}

function clearFinishedWalls() {
    var canvas = document.querySelector(".gallery_wrapper");
    var canvas_finished;
    while (canvas_finished = document.querySelector(".canvas_finished")) {
        canvas.removeChild(canvas_finished);
    }
}

function drawFinishedWalls() {
    var identifier = 0;
    var canvas_wrapper = document.querySelector(".gallery_wrapper");

    for (finishedWall of room.finishedWalls) {
        console.log(finishedWall);
        var canvas_finished = document.createElement("div");
        canvas_finished.classList.add("canvas_finished");
        canvas_finished.id = "finishedWall" + identifier;

        canvas_finished.style.width = (finishedWall.wall.width * 0.4) + "px";
        canvas_finished.style.height = (finishedWall.wall.height * 0.4) + "px";
        canvas_finished.style.borderRadius = "10%";
        canvas_finished.style.border = "3px solid cornflowerblue";
        canvas_finished.addEventListener("mouseover", handleGaleryMouseOver);
        canvas_finished.addEventListener("mouseout", handleGaleryMouseOut);

        canvas_wrapper.append(canvas_finished);
        identifier += 1;
    }
}

function handleGaleryMouseOver(e) {
    this.style.border = "3px solid mediumblue";
}

function handleGaleryMouseOut(e) {
    this.style.border = "3px solid cornflowerblue";
}

function drawFinishedHoles() {
    var identifier = 0;
    for (finishedWall of room.finishedWalls) {
        var canvas = document.querySelector("#finishedWall" + identifier);
        for (var hole of finishedWall.wall.holes) {
            // Create the hole wrapper
            var hole_wrapper = document.createElement("div");
            var hole_item = document.createElement("div");
            var posY = (hole.y * 0.4) - (25 * 0.4);
            var posX = (hole.x * 0.4) - (25 * 0.4);

            hole_item.classList.add("canvas_item_finished");
            hole_wrapper.classList.add("canvas_item_wrapper_finished");
            hole_wrapper.style.top = posY + "px";
            hole_wrapper.style.left = posX + "px";

            hole_wrapper.append(hole_item);
            canvas.append(hole_wrapper);
        }
        identifier += 1;
    }
}

function drawFinishedPieces() {
    var wallindex = 0;
    for (finishedWall of room.finishedWalls) {
        var piecesToFill = finishedWall.wall.dropedPieces;
        console.log("Pieces to fill: ", piecesToFill);
        var wall_items = document.querySelector("#finishedWall" + wallindex).children;
        for (piece of piecesToFill) {
            var img = document.createElement("img");
            var item_wrapper = wall_items[piece.id];
            var item = item_wrapper.firstElementChild;
            console.log(item_wrapper);
            console.log(item);
            img.src = piece.src;
            img.style.width = "100%";
            img.style.height = "auto";
            item.style.display = "none";
            item.parentNode.appendChild(img);
        }
        wallindex += 1;
    }
}

function cleanHoles() {
    var item_wrappers = document.querySelectorAll(".canvas_item_wrapper");
    var canvas = document.querySelector(".canvas");

    if (item_wrappers) {
        if (canvas) {
            while (canvas.firstChild) {
                canvas.removeChild(canvas.lastChild);
            }
        }
    }
}

function drawHoles(wallPosition) {
    var wall = (arguments.length === 1) ? room.walls[wallPosition] : room.walls[room.currentWall];
    var canvas = document.querySelector(".canvas");

    for (var hole of wall.holes) {
        // Create the hole wrapper
        var hole_wrapper = document.createElement("div");
        var posY = hole.y - 25;
        var posX = hole.x - 25;
        var hole_item = document.createElement("div");

        hole_item.classList.add("canvas_item");
        hole_wrapper.classList.add("canvas_item_wrapper");
        hole_wrapper.append(hole_item);
        hole_wrapper.id = "hole" + wall.holes.indexOf(hole);
        hole_wrapper.style.top = posY + "px";
        hole_wrapper.style.left = posX + "px";
        hole_wrapper.addEventListener("dragover", handleMouseOverHole);
        hole_wrapper.addEventListener("dragleave", handleMouseOutHole);
        hole_wrapper.addEventListener("drop", handleDropPiece);
        // Append the hole to the canvas
        canvas.append(hole_wrapper);
    }
}

function handleDragPieceStart(e) {
    console.log(e);
}
function handleDragPiece(e) {
    console.log(e);
}

function drawPieces(wallPosition) {
    var piecesToFill = (arguments.length === 1) ? room.walls[wallPosition].dropedPieces : room.walls[room.currentWall].dropedPieces;
    
    for (pieces of piecesToFill) {
        var img = document.createElement("img");
        var element = document.querySelector("#hole" + pieces.id).firstElementChild;
        img.src = pieces.src;
        element.style.display = "none";
        element.parentNode.appendChild(img);
    }
}

function clearPieces() {
    var item_wrappers = document.querySelectorAll(".canvas_item_wrapper");
    if (item_wrappers) {
        for (item of item_wrappers) {
            while (item.childNodes.length > 1) {
                item.removeChild(item.lastChild);
            }
        }
    }
}

function handleMouseOverHole(e) {
    e.preventDefault();
    this.classList.add("item_hover");
}

function handleMouseOutHole(e) {
    e.preventDefault();
    this.classList.remove("item_hover");
}

function handleDropPiece(e) {
    var srcImage = e.dataTransfer.getData("text");
    srcImage.includes("file:///C:/Users/oriolmoron/Documents/oriol/ECV/ecv_lab3/") ? srcImage = srcImage.replace("file:///C:/Users/oriolmoron/Documents/oriol/ECV/ecv_lab3", ".") : srcImage;

    this.classList.remove("item_hover");
    var img = document.createElement("img");
    img.src = srcImage;
    if (e.target.classList.contains("canvas_item_wrapper")) {
        e.target.firstElementChild.style.display = "none";
        e.target.appendChild(img);
        // Send the new piece's parent ID
        socket.send("WALL|PIECE|" + username + "|" + e.target.id + "|" + srcImage);
    } else {
        e.target.style.display = "none";
        e.target.parentElement.appendChild(img);
        // Send the new piece's parent ID
        socket.send("WALL|PIECE|" + username + "|" + e.target.parentElement.id + "|" + srcImage);
    }
}

/*******Funcions del chatcode.js que vaig posant aqui adaptades*******/
function joinServer() {
    username = document.querySelector("#username-field").value;
    roomname = document.querySelector("#roomname-field").value;

    if (username === "" || roomname === "") {
        alert("Type a username and a room name in order to join the server!!!");
        return;
    }

    // User joins a room
    if (avatar === undefined) {
        avatar = "img/avatars/avatar_1.png";
    }

    socket.join(roomname, avatar, username);
}

function logIn() {
    console.log("Username " + username + " joined " + roomname);

    document.querySelector("#sendMsgBtn").addEventListener("click", sendMsg);
    document.querySelector("#inputMsg").addEventListener("keypress", sendMsgEnter);

    changeRoomName(roomname);

    // Hide the login form once we jump to the room
    displayElement(".login-form", "none");

    // Show the messages and the user list once we are in the room
    displayElement(".message-content", "table");
    displayElement(".users-list", "inline-block");

    // Show canvas
    displayElement(".canvas_wrapper", "inline-block");

    // show sprites
    displayElement(".sprites", "inline-block");

    // Show the room name
    displayElement("#roomname-header-label", "inline-block");

    // Show the exit room button
    displayElement("#goBack", "inline-block");
    displayElement("#goChat", "inline-block");
    displayElement("#goGallery", "inline-block");

    // Hide the warning
    displayElement("#warning_user_exists", "none");

}

function handleConfirmWall(e) {
    var user = document.querySelector(".owner");

    if (confirmWall.classList.contains("confirm")) {
        user.classList.add("selected");
        toggleConfirmDecline("confirm");
        socket.send("WALL|CONFIRM|" + username + "|true");
    } else {
        user.classList.remove("selected");
        toggleConfirmDecline("decline");
        socket.send("WALL|CONFIRM|" + username + "|false");
    }
}

function toggleConfirmDecline(isConfirm) {
    if (isConfirm === "confirm") {
        confirmWall.classList.remove("confirm");
        confirmWall.classList.add("decline");
        confirmWall.innerHTML = "decline";
    } else if (isConfirm === "decline"){
        confirmWall.classList.remove("decline");
        confirmWall.classList.add("confirm");
        confirmWall.innerHTML = "confirm";
    }
}

function executeError(message) {
    if (message[0] != "ERROR") return;
    switch (message[1]) {
        case "USER" : {
            if (message[2] == "EXISTS") {
                logged = false;
                displayElement("#warning_user_exists", "block");
            }
        }
    }
}

async function executeRefresh() {
    removeMessages();
    readMessages();
    // Draw galery
    clearFinishedWalls();
    drawFinishedWalls();
    drawFinishedHoles();
    drawFinishedPieces();

    // Check if everybody accepted the current wall and a new one has to be drawn
    if (checkChangeWall()) {
        cleanUserList();
        userListConfirmed();
        document.querySelector(".canvas").classList.add("wall_done");
        await new Promise(x => setTimeout(x, 3000));
        setWallNumber(room.currentWall);
        document.querySelector(".canvas").classList.remove("wall_done");
        toggleConfirmDecline("decline");
    } else {
        setWallNumber(room.currentWall);
    }

    cleanUserList();
    readUserList();

    if (room.currentWall === 8) {
        if (!document.querySelector(".canvas")) {
            drawWall(room.currentWall - 1);
            cleanHoles();
            drawHoles(room.currentWall - 1);
            clearPieces();
            drawPieces(room.currentWall - 1);
        }
        document.querySelector(".canvas").classList.add("disabled_div");
        document.querySelector("#goConfirm").classList.add("disabled_div");
        toggleConfirmDecline("decline");
    } else {
        drawWall();
        cleanHoles();
        drawHoles();
        clearPieces();
        drawPieces();
    }
}


function setWallNumber(number) {
    document.querySelector("#wallnumber").innerHTML = number + " of 8";
}

function removeMessages() {
    var msgboard = document.querySelector("#msgboard");

    while (msgboard.firstChild) {
        msgboard.removeChild(msgboard.firstChild);
    }
}

function checkChangeWall() {
    var canvas = document.querySelector("#canvas");

    if (!canvas) {
        return false;
    }

    var widthCurrentWall = canvas.offsetWidth;
    var heightCurrentWall = canvas.offsetHeight;
    var futureWall = room.walls[room.currentWall];

    if (room.currentWall < 8) {
        if (((widthCurrentWall != futureWall.width) || (heightCurrentWall != futureWall.height))) {
            return true;
        }
    }

    return false;
}

function readMessages() {
    for (var i = 0; i < room.messages.length; i++) {
        addMessage(room.messages[i].username, room.messages[i].data)
    }
}

function addMessage(u_name, message) {
    var msgcontainer = document.createElement("div"),
        msgauthor = document.createElement("div"),
        msgcontent = document.createElement("div");

    // Add the corresponding CSS classes to the divs
    msgcontainer.classList.add("message");
    if (u_name == username) {
        msgcontainer.classList.add("owner");
    }
    msgauthor.classList.add("message-user");
    msgcontent.classList.add("message-txt");

    // Initialize the message and build the structure
    msgauthor.innerHTML = u_name;
    msgcontent.innerHTML = message;
    msgcontainer.appendChild(msgauthor);
    msgcontainer.appendChild(msgcontent);

    // Append the whole message to the board of messages
    msgboard.appendChild(msgcontainer);
}

function checkUserExists() {
    for (user of room.users) {
        if (user.name === username) {
            return true;
        }
    }
    return false;
}

function readUserList() {
    var isOwner = false;
    for (user of room.users) {
        (user.name != username) ? isOwner = false : isOwner = true;
        addUserToUserList(user.name, user.avatar, user.confirmed, isOwner);
    }
}

function userListConfirmed() {
    for (user of room.users) {
        (user.name != username) ? isOwner = false : isOwner = true;
        addUserToUserList(user.name, user.avatar, true, isOwner);
    }
}

function addUserToUserList(username, avatar, confirmed, owner) {
    var user = document.createElement("li"),
        userAvatar = document.createElement("img"),
        userName = document.createElement("span"),
        logLine = document.createElement("div");

    userAvatar.src = avatar;
    userName.innerHTML = username;

    user.appendChild(userAvatar);
    user.appendChild(userName);

    if (owner) {
        user.classList.add("owner");
    }

    if (confirmed == true) {
        user.classList.add("selected")
    } else if ((confirmed == false) && (user.classList.contains("selected"))) {
        user.classList.remove("selected");
    }

    document.querySelector("#user-list").appendChild(user);
}

function cleanUserList() {
    var user_list = document.querySelector("#user-list");

    while (user_list.hasChildNodes()) {
        user_list.removeChild(user_list.childNodes[0]);
    }
}

function selectAvatar(event) {
    var i,
        avatar_selected = event.target.parentNode,
        avatar_siblings = avatar_selected.parentNode.childNodes;

    for (i = 1; i < avatar_siblings.length; i += 2) {
        avatar_siblings[i].classList.remove("selected");
    }

    avatar_selected.classList.add("selected");
    avatar = avatar_selected.childNodes[0].getAttribute("src");
}

// Usefull function to show or hide elements
function displayElement(element, mode) {
    var elem = document.querySelector(element);
    elem.style.display = mode;
}

function changeRoomName(roomname) {
    document.querySelector("#roomname-header").innerHTML = roomname;
}

function sendMsgEnter(event) {
    if (event.key === "Enter") {
        sendMsg();
    }
}

function sendMsg() {
    var input = document.querySelector("#inputMsg"),
        msgboard = document.querySelector(".msgboard"),
        msgcontainer = document.createElement("div"),
        msgauthor = document.createElement("div"),
        msgcontent = document.createElement("div"),
        message_processed = input.value;

    // Process the message
    var list_of_emojis_regex = [':\\)', ";\\)", "\\(y\\)", ":\\(", ":P", "<3"];
    var list_of_emojis = [':)', ';)', '(y)', ':(', ":P", "<3"];

    for (emoji in list_of_emojis) {
        // Replace each emoji for its html value
        message_processed = message_processed.replace(new RegExp(list_of_emojis_regex[emoji], 'igm'), getMessageEmoji(list_of_emojis[emoji]));
    }


    // Add the corresponding CSS classes to the divs
    msgcontainer.classList.add("message");
    msgcontainer.classList.add("owner");
    msgauthor.classList.add("message-user");
    msgcontent.classList.add("message-txt");

    console.log("User " + username + " sends a message")
    // Append the whole message to the board of messages
    // Initialize the message and build the structure
    msgauthor.innerHTML = username;
    msgcontent.innerHTML = message_processed;
    msgcontainer.appendChild(msgauthor);
    msgcontainer.appendChild(msgcontent);

    //Send the message to the server
    socket.send("MSG|" + username + "|" + message_processed);

    console.log("Sending message: " + input.value);
    input.value = "";
}

function getMessageEmoji(tag) {
    switch (tag) {
        case ":)": {
            return '<i class="em em-slightly_smiling_face" aria-role="presentation" aria-label="SLIGHTLY SMILING FACE"></i>';
        } case ";)": {
            return '<i class="em em-stuck_out_tongue_winking_eye" aria-role="presentation" aria-label="FACE WITH STUCK-OUT TONGUE AND WINKING EYE"></i>';
        } case "(y)": {
            return '<i class="em em---1" aria-role="presentation" aria-label="THUMBS UP SIGN"></i>';
        } case ":(": {
            return '<i class="em em-angry" aria-role="presentation" aria-label="ANGRY FACE"></i>';
        } case ":P": {
            return '<i class="em em-zany_face" aria-role="presentation" aria-label="GRINNING FACE WITH ONE LARGE AND ONE SMALL EYE"></i>';
        } case "<3": {
            return '<i class="em em-heart" aria-role="presentation" aria-label="HEAVY BLACK HEART"></i>';
        } default: {
            return '';
        }
    }
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function toggleChat() {
    if (chat.className == "msgboard hide"){
        chat.className = "msgboard show";
        chatButton.innerHTML = 'close chat';
    } else {
        chat.className ='msgboard hide';
        chatButton.innerHTML = 'open chat';
    }
}

function toggleGallery() {
    if (gallery.style.display == "none"){
        displayElement(".gallery_wrapper", "inline-block");
        galleryButton.innerHTML = "close gallery";
        displayElement(".canvas_wrapper", "none");
        document.querySelector(".sprites").classList.add("disabled_div");
        document.querySelector(".users-list").classList.add("disabled_div");
    } else {
        displayElement(".gallery_wrapper", "none");
        galleryButton.innerHTML = "open gallery";
        displayElement(".canvas_wrapper", "inline-block");
        document.querySelector(".sprites").classList.remove("disabled_div");
        document.querySelector(".users-list").classList.remove("disabled_div");
    }
}

function handleOnDragPiece(e) {
    e.preventDefault();
    var srcImage = e.target.getAttribute("src");
    e.dataTransfer.setData("text", srcImage);
}

// Hide the messages, warnings, userlist and room name
displayElement(".message-content", "none");
displayElement(".sprites", "none");
displayElement("#roomname-header-label", "none");
displayElement(".warning", "none");
displayElement(".canvas_wrapper", "none");
displayElement("#goBack", "none");
displayElement("#goChat", "none");
displayElement("#goGallery", "none");
displayElement(".gallery_wrapper", "none");
displayElement(".users-list", "none");

avatars.addEventListener("click", selectAvatar);
sendbtn.addEventListener("click", joinServer);
chatButton.addEventListener("click", toggleChat);
galleryButton.addEventListener("click", toggleGallery);
confirmWall.addEventListener("click", handleConfirmWall);
exitRoom.addEventListener("click", function() {
    window.location.reload(true);
});

for (var sprite of sprites) {
    sprite.addEventListener("drag", handleOnDragPiece);
    sprite.style.cursor = "pointer";
}

