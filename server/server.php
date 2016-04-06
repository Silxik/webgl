<?php
require 'main.php';
define('SERVER_BIND_HOST', getHostByName(getHostName()));   // Change accordingly
define('SERVER_BIND_PORT', 9300);
set_time_limit(0);

$users = array();
$scores = array();
function wsOnMessage($clientID, $message, $messageLength, $binary)
{
    global $users;
    if ($messageLength == 0) {
        wsClose($clientID);
        return;
    }
    $message = explode(' ', $message);
    $command = array_shift($message);
    if ($command == 'T') {
        if (!isUser($clientID)) {
            wsClose($clientID);
            return;
        }
        $text = implode(' ', $message);
        if ($text == '') {
            wsSend($clientID, 'S Message was blank.');
            return;
        }
        sendText($users[$clientID], $text);
    } elseif ($command == 'J') {
        if (isUser($clientID)) {
            wsClose($clientID);
            return;
        }
        $username = trim($message[0]);
        if ($username == '') {
            wsClose($clientID);
            return;
        }
        if (nameTaken($username)) {
            wsClose($clientID);
            return;
        }
        addUser($clientID, $username);
    } elseif ($command == 'Q') {
        if (!isUser($clientID)) {
            wsClose($clientID);
            return;
        }
        removeUser($clientID);
    } else {
        wsClose($clientID);
    }
}

function wsOnClose($clientID, $status)
{
    if (isUser($clientID)) {
        removeUser($clientID);
    }
}

function isUser($clientID)
{
    global $users;
    return isset($users[$clientID]);
}

function addUser($clientID, $username)
{
    global $users;
    foreach ($users as $clientID2 => $username2) {
        wsSend($clientID2, 'J ' . $username);
    }
    $usernames = array();
    foreach ($users as $username2) {
        $usernames[] = $username2;
    }
    wsSend($clientID, 'U ' . implode(' ', $usernames));
    $users[$clientID] = $username;
    echo "($clientID)$username joined.\n";
}

function removeUser($clientID)
{
    global $users;
    $username = $users[$clientID];
    unset($users[$clientID]);
    foreach ($users as $clientID2 => $username2) {
        wsSend($clientID2, 'Q ' . $username);
    }
    echo "($clientID)$username left.\n";
}

function nameTaken($username)
{
    global $users;
    foreach ($users as $username2) {
        if ($username === $username2) return true;
    }
    return false;
}

function sendText($username, $text)
{
    global $users;
    foreach ($users as $clientID => $user) {
        wsSend($clientID, 'T ' . $username . ' ' . $text);
    }
}

wsStartServer(SERVER_BIND_HOST, SERVER_BIND_PORT);
?>