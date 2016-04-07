<?php
require 'main.php';
define('SERVER_BIND_HOST', getHostByName(getHostName()));   // Change accordingly
define('SERVER_BIND_PORT', 9300);
set_time_limit(0);

$users = array();

function wsOnMessage($clientID, $message, $messageLength, $binary)
{
    global $users;
    $message = explode(' ', $message);
    $command = array_shift($message);
    if ($command == 'J') {
        if (isUser($clientID)) {
            wsClose($clientID);
            return;
        }
        $name = trim($message[0]);
        if ($name == '') {
            wsClose($clientID);
            return;
        }
        if (nameTaken($name)) {
            wsClose($clientID);
            return;
        }
        addUser($clientID, $name);
    } else if ($messageLength == 0 || !isUser($clientID)) {
        wsClose($clientID);
        return;
    } else if ($command == 'D') {
        
    } elseif ($command == 'Q') {
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

function addUser($clientID, $name)
{
    global $users;
    foreach ($users as $userID => $data) {
        wsSend($userID, 'J ' . $name);
    }
    $names = array();
    foreach ($users as $data) {
        $names[] = $data->name;
    }
    wsSend($clientID, 'U ' . implode(' ', $names));
    $users[$clientID] = (object)[
        'queue' => array(),
        'name' => $name,
        'ang' => 0
    ];
    echo "($clientID)$name joined.\n";
}

function removeUser($clientID)
{
    global $users;
    $name = $users[$clientID]->name;
    unset($users[$clientID]);
    foreach ($users as $userID => $data) {
        wsSend($userID, 'Q ' . $name);
    }
    echo "($clientID)$name left.\n";
}

function nameTaken($name)
{
    global $users;
    foreach ($users as $data) {
        if ($name === $data->name) return true;
    }
    return false;
}

wsStartServer(SERVER_BIND_HOST, SERVER_BIND_PORT);
?>