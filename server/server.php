<?php
require 'main.php';
define('SERVER_BIND_HOST', getHostByName(getHostName()));   // Change accordingly
define('SERVER_BIND_PORT', 9300);
set_time_limit(0);

$users = [];

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
        $c = $users[$clientID];
        // Update client parameters
        $c->ang = $message[0];
        $c->pos[0] = $message[1];
        $c->pos[1] = $message[2];
        $c->vel[0] = $message[3];
        $c->vel[1] = $message[4];
        // Let other clients know that new data is available
        foreach ($users as $userID => $data) {
            if ($userID != $clientID) {
                $users[$userID]->queue[$clientID] = 1;
            }
        }
        $data = '';
        // Send updates back to the client
        foreach ($c->queue as $userID => $one) {
            if ($one) {
            $u = $users[$userID];
            $data .= ' ' . $u->name . ' ' .
                $u->ang . ' ' .
                $u->pos[0] . ' ' . $u->pos[1] . ' ' .
                $u->vel[0] . ' ' . $u->vel[1];
                $c->queue[$userID] = 0;
            }
        }

        wsSend($clientID, 'D' . $data);

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
    $names = [];
    foreach ($users as $data) {
        $names[] = $data->name;
    }
    wsSend($clientID, 'U ' . implode(' ', $names));
    $users[$clientID] = (object)[
        'queue' => [],
        'name' => $name,
        'ang' => 0,
        'pos' => [0, 0],
        'vel' => [0, 0]
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
        unset($users[$userID]->queue[$clientID]);
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