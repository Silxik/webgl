<?php
define('WS_MAX_CLIENTS', 100);
define('WS_MAX_CLIENTS_PER_IP', 15);
define('WS_TIMEOUT_RECV', 10);
define('WS_TIMEOUT_PONG', 5);
define('WS_MAX_FRAME_PAYLOAD_RECV', 100000);
define('WS_MAX_MESSAGE_PAYLOAD_RECV', 500000);
define('WS_FIN', 128);
define('WS_MASK', 128);
define('WS_OPCODE_CONTINUATION', 0);
define('WS_OPCODE_TEXT', 1);
define('WS_OPCODE_BINARY', 2);
define('WS_OPCODE_CLOSE', 8);
define('WS_OPCODE_PING', 9);
define('WS_OPCODE_PONG', 10);
define('WS_PAYLOAD_LENGTH_16', 126);
define('WS_PAYLOAD_LENGTH_63', 127);
define('WS_READY_STATE_CONNECTING', 0);
define('WS_READY_STATE_OPEN', 1);
define('WS_READY_STATE_CLOSING', 2);
define('WS_READY_STATE_CLOSED', 3);
define('WS_STATUS_NORMAL_CLOSE', 1000);
define('WS_STATUS_GONE_AWAY', 1001);
define('WS_STATUS_PROTOCOL_ERROR', 1002);
define('WS_STATUS_UNSUPPORTED_MESSAGE_TYPE', 1003);
define('WS_STATUS_MESSAGE_TOO_BIG', 1004);
define('WS_STATUS_TIMEOUT', 3000);
$wsClients = array();
$wsRead = array();
$wsClientCount = 0;
$wsClientIPCount = array();
function wsStartServer($host, $port)
{
    global $wsRead, $wsClientCount, $wsClientIPCount;

    echo "Starting server on $host : $port\n";
    if (isset($wsRead[0])) return false;

    if (!$wsRead[0] = socket_create(AF_INET, SOCK_STREAM, SOL_TCP)) {
        return false;
    }
    if (!socket_set_option($wsRead[0], SOL_SOCKET, SO_REUSEADDR, 1)) {
        socket_close($wsRead[0]);
        return false;
    }
    if (!socket_bind($wsRead[0], $host, $port)) {
        socket_close($wsRead[0]);
        return false;
    }
    if (!socket_listen($wsRead[0], 10)) {
        socket_close($wsRead[0]);
        return false;
    }
    echo "Server running.\n";

    $portTest = @fsockopen($host, $port);
    if (is_resource($portTest)) {
        echo "port $port is open.\n";
        fclose($portTest);
    } else {
        echo "port $port is not forwarded.\n";
    }

    $write = array();
    $except = array();

    $nextPingCheck = time() + 1;
    while (isset($wsRead[0])) {
        $changed = $wsRead;
        $result = socket_select($changed, $write, $except, 1);

        if ($result === false) {
            socket_close($wsRead[0]);
            return false;
        } elseif ($result > 0) {
            foreach ($changed as $clientID => $socket) {
                if ($clientID != 0) {
                    // client socket changed
                    $buffer = '';
                    $bytes = @socket_recv($socket, $buffer, 4096, 0);

                    if ($bytes === false) {
                        // error on recv, remove client socket (will check to send close frame)
                        wsSendClientClose($clientID, WS_STATUS_PROTOCOL_ERROR);
                    } elseif ($bytes > 0) {
                        // process handshake or frame(s)
                        if (!wsProcessClient($clientID, $buffer, $bytes)) {
                            wsSendClientClose($clientID, WS_STATUS_PROTOCOL_ERROR);
                        }
                    } else {
                        // 0 bytes received from client, meaning the client closed the TCP connection
                        wsRemoveClient($clientID);
                    }
                } else {
                    // listen socket changed
                    $client = socket_accept($wsRead[0]);
                    if ($client !== false) {
                        // fetch client IP as integer
                        $clientIP = '';
                        $result = socket_getpeername($client, $clientIP);
                        echo "(" . wsGetNextClientID() . ")$clientIP connected.\n";
                        $clientIP = ip2long($clientIP);
                        if ($result !== false && $wsClientCount < WS_MAX_CLIENTS && (!isset($wsClientIPCount[$clientIP]) || $wsClientIPCount[$clientIP] < WS_MAX_CLIENTS_PER_IP)) {
                            wsAddClient($client, $clientIP);
                        } else {
                            socket_close($client);
                        }
                    }
                }
            }
        }

        if (time() >= $nextPingCheck) {
            wsCheckIdleClients();
            $nextPingCheck = time() + 1;
        }
    }

    return true; // returned when wsStopServer() is called
}

function wsStopServer()
{
    global $wsClients, $wsRead, $wsClientCount, $wsClientIPCount;

    // check if server is not running
    if (!isset($wsRead[0])) return false;

    // close all client connections
    foreach ($wsClients as $clientID => $client) {
        // if the client's opening handshake is complete, tell the client the server is 'going away'
        if ($client[2] != WS_READY_STATE_CONNECTING) {
            wsSendClientClose($clientID, WS_STATUS_GONE_AWAY);
        }
        socket_close($client[0]);
    }

    // close the socket which listens for incoming clients
    socket_close($wsRead[0]);

    // reset variables
    $wsRead = array();
    $wsClients = array();
    $wsClientCount = 0;
    $wsClientIPCount = array();

    return true;
}

function wsCheckIdleClients()
{
    global $wsClients;

    $time = time();
    foreach ($wsClients as $clientID => $client) {
        if ($client[2] != WS_READY_STATE_CLOSED) {
            // client ready state is not closed
            if ($client[4] !== false) {
                // ping request has already been sent to client, pending a pong reply
                if ($time >= $client[4] + WS_TIMEOUT_PONG) {
                    // client didn't respond to the server's ping request in WS_TIMEOUT_PONG seconds
                    wsSendClientClose($clientID, WS_STATUS_TIMEOUT);
                    wsRemoveClient($clientID);
                }
            } elseif ($time >= $client[3] + WS_TIMEOUT_RECV) {
                // last data was received >= WS_TIMEOUT_RECV seconds ago
                if ($client[2] != WS_READY_STATE_CONNECTING) {
                    // client ready state is open or closing
                    $wsClients[$clientID][4] = time();
                    wsSendClientMessage($clientID, WS_OPCODE_PING, '');
                } else {
                    // client ready state is connecting
                    wsRemoveClient($clientID);
                }
            }
        }
    }
}

function wsAddClient($socket, $clientIP)
{
    global $wsClients, $wsRead, $wsClientCount, $wsClientIPCount;

    // increase amount of clients connected
    $wsClientCount++;

    // increase amount of clients connected on this client's IP
    if (isset($wsClientIPCount[$clientIP])) {
        $wsClientIPCount[$clientIP]++;
    } else {
        $wsClientIPCount[$clientIP] = 1;
    }

    // fetch next client ID
    $clientID = wsGetNextClientID();

    // store initial client data
    $wsClients[$clientID] = array($socket, '', WS_READY_STATE_CONNECTING, time(), false, 0, $clientIP, false, 0, '', 0, 0);

    // store socket - used for socket_select()
    $wsRead[$clientID] = $socket;
}

function wsRemoveClient($clientID)
{
    global $wsClients, $wsRead, $wsClientCount, $wsClientIPCount;

    // fetch close status (which could be false), and call wsOnClose
    $closeStatus = $wsClients[$clientID][5];
    if (function_exists('wsOnClose')) wsOnClose($clientID, $closeStatus);

    // close socket
    $socket = $wsClients[$clientID][0];
    socket_close($socket);

    // decrease amount of clients connected on this client's IP
    $clientIP = $wsClients[$clientID][6];
    if ($wsClientIPCount[$clientIP] > 1) {
        $wsClientIPCount[$clientIP]--;
    } else {
        unset($wsClientIPCount[$clientIP]);
    }

    // decrease amount of clients connected
    $wsClientCount--;

    // remove socket and client data from arrays
    unset($wsRead[$clientID], $wsClients[$clientID]);
}

function wsGetNextClientID()
{
    global $wsRead;
    $i = 1; // starts at 1 because 0 is the listen socket
    while (isset($wsRead[$i])) $i++;
    return $i;
}

function wsGetClientSocket($clientID)
{
    global $wsClients;
    return $wsClients[$clientID][0];
}

function wsProcessClient($clientID, &$buffer, $bufferLength)
{
    global $wsClients;

    if ($wsClients[$clientID][2] == WS_READY_STATE_OPEN) {
        // handshake completed
        $result = wsBuildClientFrame($clientID, $buffer, $bufferLength);
    } elseif ($wsClients[$clientID][2] == WS_READY_STATE_CONNECTING) {
        // handshake not completed
        $result = wsProcessClientHandshake($clientID, $buffer);
        if ($result) {
            $wsClients[$clientID][2] = WS_READY_STATE_OPEN;
            if (function_exists('wsOnOpen')) wsOnOpen($clientID);
        }
    } else {
        // ready state is set to closed
        $result = false;
    }

    return $result;
}

function wsBuildClientFrame($clientID, &$buffer, $bufferLength)
{
    global $wsClients;

    // increase number of bytes read for the frame, and join buffer onto end of the frame buffer
    $wsClients[$clientID][8] += $bufferLength;
    $wsClients[$clientID][9] .= $buffer;

    // check if the length of the frame's payload data has been fetched, if not then attempt to fetch it from the frame buffer
    if ($wsClients[$clientID][7] !== false || wsCheckSizeClientFrame($clientID) == true) {
        // work out the header length of the frame
        $headerLength = ($wsClients[$clientID][7] <= 125 ? 0 : ($wsClients[$clientID][7] <= 65535 ? 2 : 8)) + 6;

        // check if all bytes have been received for the frame
        $frameLength = $wsClients[$clientID][7] + $headerLength;
        if ($wsClients[$clientID][8] >= $frameLength) {
            // check if too many bytes have been read for the frame (they are part of the next frame)
            $nextFrameBytesLength = $wsClients[$clientID][8] - $frameLength;
            if ($nextFrameBytesLength > 0) {
                $wsClients[$clientID][8] -= $nextFrameBytesLength;
                $nextFrameBytes = substr($wsClients[$clientID][9], $frameLength);
                $wsClients[$clientID][9] = substr($wsClients[$clientID][9], 0, $frameLength);
            }

            // process the frame
            $result = wsProcessClientFrame($clientID);

            // check if the client wasn't removed, then reset frame data
            if (isset($wsClients[$clientID])) {
                $wsClients[$clientID][7] = false;
                $wsClients[$clientID][8] = 0;
                $wsClients[$clientID][9] = '';
            }

            // if there's no extra bytes for the next frame, or processing the frame failed, return the result of processing the frame
            if ($nextFrameBytesLength <= 0 || !$result) return $result;

            // build the next frame with the extra bytes
            return wsBuildClientFrame($clientID, $nextFrameBytes, $nextFrameBytesLength);
        }
    }

    return true;
}

function wsCheckSizeClientFrame($clientID)
{
    global $wsClients;

    // check if at least 2 bytes have been stored in the frame buffer
    if ($wsClients[$clientID][8] > 1) {
        // fetch payload length in byte 2, max will be 127
        $payloadLength = ord(substr($wsClients[$clientID][9], 1, 1)) & 127;

        if ($payloadLength <= 125) {
            // actual payload length is <= 125
            $wsClients[$clientID][7] = $payloadLength;
        } elseif ($payloadLength == 126) {
            // actual payload length is <= 65,535
            if (substr($wsClients[$clientID][9], 3, 1) !== false) {
                // at least another 2 bytes are set
                $payloadLengthExtended = substr($wsClients[$clientID][9], 2, 2);
                $array = unpack('na', $payloadLengthExtended);
                $wsClients[$clientID][7] = $array['a'];
            }
        } else {
            // actual payload length is > 65,535
            if (substr($wsClients[$clientID][9], 9, 1) !== false) {
                // at least another 8 bytes are set
                $payloadLengthExtended = substr($wsClients[$clientID][9], 2, 8);

                // check if the frame's payload data length exceeds 2,147,483,647 (31 bits)
                // the maximum integer in PHP is "usually" this number. More info: http://php.net/manual/en/language.types.integer.php
                $payloadLengthExtended32_1 = substr($payloadLengthExtended, 0, 4);
                $array = unpack('Na', $payloadLengthExtended32_1);
                if ($array['a'] != 0 || ord(substr($payloadLengthExtended, 4, 1)) & 128) {
                    wsSendClientClose($clientID, WS_STATUS_MESSAGE_TOO_BIG);
                    return false;
                }

                // fetch length as 32 bit unsigned integer, not as 64 bit
                $payloadLengthExtended32_2 = substr($payloadLengthExtended, 4, 4);
                $array = unpack('Na', $payloadLengthExtended32_2);

                // check if the payload data length exceeds 2,147,479,538 (2,147,483,647 - 14 - 4095)
                // 14 for header size, 4095 for last recv() next frame bytes
                if ($array['a'] > 2147479538) {
                    wsSendClientClose($clientID, WS_STATUS_MESSAGE_TOO_BIG);
                    return false;
                }

                // store frame payload data length
                $wsClients[$clientID][7] = $array['a'];
            }
        }

        // check if the frame's payload data length has now been stored
        if ($wsClients[$clientID][7] !== false) {

            // check if the frame's payload data length exceeds WS_MAX_FRAME_PAYLOAD_RECV
            if ($wsClients[$clientID][7] > WS_MAX_FRAME_PAYLOAD_RECV) {
                $wsClients[$clientID][7] = false;
                wsSendClientClose($clientID, WS_STATUS_MESSAGE_TOO_BIG);
                return false;
            }

            // check if the message's payload data length exceeds 2,147,483,647 or WS_MAX_MESSAGE_PAYLOAD_RECV
            // doesn't apply for control frames, where the payload data is not internally stored
            $controlFrame = (ord(substr($wsClients[$clientID][9], 0, 1)) & 8) == 8;
            if (!$controlFrame) {
                $newMessagePayloadLength = $wsClients[$clientID][11] + $wsClients[$clientID][7];
                if ($newMessagePayloadLength > WS_MAX_MESSAGE_PAYLOAD_RECV || $newMessagePayloadLength > 2147483647) {
                    wsSendClientClose($clientID, WS_STATUS_MESSAGE_TOO_BIG);
                    return false;
                }
            }

            return true;
        }
    }

    return false;
}

function wsProcessClientFrame($clientID)
{
    global $wsClients;

    // store the time that data was last received from the client
    $wsClients[$clientID][3] = time();

    // fetch frame buffer
    $buffer = &$wsClients[$clientID][9];

    // check at least 6 bytes are set (first 2 bytes and 4 bytes for the mask key)
    if (substr($buffer, 5, 1) === false) return false;

    // fetch first 2 bytes of header
    $octet0 = ord(substr($buffer, 0, 1));
    $octet1 = ord(substr($buffer, 1, 1));

    $fin = $octet0 & WS_FIN;
    $opcode = $octet0 & 15;

    $mask = $octet1 & WS_MASK;
    if (!$mask) return false; // close socket, as no mask bit was sent from the client

    // fetch byte position where the mask key starts
    $seek = $wsClients[$clientID][7] <= 125 ? 2 : ($wsClients[$clientID][7] <= 65535 ? 4 : 10);

    // read mask key
    $maskKey = substr($buffer, $seek, 4);

    $array = unpack('Na', $maskKey);
    $maskKey = $array['a'];
    $maskKey = array(
        $maskKey >> 24,
        ($maskKey >> 16) & 255,
        ($maskKey >> 8) & 255,
        $maskKey & 255
    );
    $seek += 4;

    // decode payload data
    if (substr($buffer, $seek, 1) !== false) {
        $data = str_split(substr($buffer, $seek));
        foreach ($data as $key => $byte) {
            $data[$key] = chr(ord($byte) ^ ($maskKey[$key % 4]));
        }
        $data = implode('', $data);
    } else {
        $data = '';
    }

    // check if this is not a continuation frame and if there is already data in the message buffer
    if ($opcode != WS_OPCODE_CONTINUATION && $wsClients[$clientID][11] > 0) {
        // clear the message buffer
        $wsClients[$clientID][11] = 0;
        $wsClients[$clientID][1] = '';
    }

    // check if the frame is marked as the final frame in the message
    if ($fin == WS_FIN) {
        // check if this is the first frame in the message
        if ($opcode != WS_OPCODE_CONTINUATION) {
            // process the message
            return wsProcessClientMessage($clientID, $opcode, $data, $wsClients[$clientID][7]);
        } else {
            // increase message payload data length
            $wsClients[$clientID][11] += $wsClients[$clientID][7];

            // push frame payload data onto message buffer
            $wsClients[$clientID][1] .= $data;

            // process the message
            $result = wsProcessClientMessage($clientID, $wsClients[$clientID][10], $wsClients[$clientID][1], $wsClients[$clientID][11]);

            // check if the client wasn't removed, then reset message buffer and message opcode
            if (isset($wsClients[$clientID])) {
                $wsClients[$clientID][1] = '';
                $wsClients[$clientID][10] = 0;
                $wsClients[$clientID][11] = 0;
            }

            return $result;
        }
    } else {
        // check if the frame is a control frame, control frames cannot be fragmented
        if ($opcode & 8) return false;

        // increase message payload data length
        $wsClients[$clientID][11] += $wsClients[$clientID][7];

        // push frame payload data onto message buffer
        $wsClients[$clientID][1] .= $data;

        // if this is the first frame in the message, store the opcode
        if ($opcode != WS_OPCODE_CONTINUATION) {
            $wsClients[$clientID][10] = $opcode;
        }
    }

    return true;
}

function wsProcessClientMessage($clientID, $opcode, &$data, $dataLength)
{
    global $wsClients;

    // check opcodes
    if ($opcode == WS_OPCODE_PING) {
        // received ping message
        return wsSendClientMessage($clientID, WS_OPCODE_PONG, $data);
    } elseif ($opcode == WS_OPCODE_PONG) {
        // received pong message (it's valid if the server did not send a ping request for this pong message)
        if ($wsClients[$clientID][4] !== false) {
            $wsClients[$clientID][4] = false;
        }
    } elseif ($opcode == WS_OPCODE_CLOSE) {
        // received close message
        if (substr($data, 1, 1) !== false) {
            $array = unpack('na', substr($data, 0, 2));
            $status = $array['a'];
        } else {
            $status = false;
        }

        if ($wsClients[$clientID][2] == WS_READY_STATE_CLOSING) {
            // the server already sent a close frame to the client, this is the client's close frame reply
            // (no need to send another close frame to the client)
            $wsClients[$clientID][2] = WS_READY_STATE_CLOSED;
        } else {
            // the server has not already sent a close frame to the client, send one now
            wsSendClientClose($clientID, WS_STATUS_NORMAL_CLOSE);
        }

        wsRemoveClient($clientID);
    } elseif ($opcode == WS_OPCODE_TEXT || $opcode == WS_OPCODE_BINARY) {
        // received text or binary message
        if (function_exists('wsOnMessage')) wsOnMessage($clientID, $data, $dataLength, $opcode == WS_OPCODE_BINARY);
    } else {
        // unknown opcode
        return false;
    }

    return true;
}

function wsProcessClientHandshake($clientID, &$buffer)
{
    // fetch headers and request line
    $sep = strpos($buffer, "\r\n\r\n");
    if (!$sep) return false;

    $headers = explode("\r\n", substr($buffer, 0, $sep));
    $headersCount = sizeof($headers); // includes request line
    if ($headersCount < 1) return false;

    // fetch request and check it has at least 3 parts (space tokens)
    $request = &$headers[0];
    $requestParts = explode(' ', $request);
    $requestPartsSize = sizeof($requestParts);
    if ($requestPartsSize < 3) return false;

    // check request method is GET
    if (strtoupper($requestParts[0]) != 'GET') return false;

    // check request HTTP version is at least 1.1
    $httpPart = &$requestParts[$requestPartsSize - 1];
    $httpParts = explode('/', $httpPart);
    if (!isset($httpParts[1]) || (float)$httpParts[1] < 1.1) return false;

    // store headers into a keyed array: array[headerKey] = headerValue
    $headersKeyed = array();
    for ($i = 1; $i < $headersCount; $i++) {
        $parts = explode(':', $headers[$i]);
        if (!isset($parts[1])) return false;

        $headersKeyed[trim($parts[0])] = trim($parts[1]);
    }

    // check Host header was received
    if (!isset($headersKeyed['Host'])) return false;

    // check Sec-WebSocket-Key header was received and decoded value length is 16
    if (!isset($headersKeyed['Sec-WebSocket-Key'])) return false;
    $key = $headersKeyed['Sec-WebSocket-Key'];
    if (strlen(base64_decode($key)) != 16) return false;

    // check Sec-WebSocket-Version header was received and value is 7
    if (!isset($headersKeyed['Sec-WebSocket-Version']) || (int)$headersKeyed['Sec-WebSocket-Version'] < 7) return false; // should really be != 7, but Firefox 7 beta users send 8

    // work out hash to use in Sec-WebSocket-Accept reply header
    $hash = base64_encode(sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));

    // build headers
    $headers = array(
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' . $hash
    );
    $headers = implode("\r\n", $headers) . "\r\n\r\n";

    // send headers back to client
    global $wsClients;
    $socket = $wsClients[$clientID][0];

    $left = strlen($headers);
    do {
        $sent = @socket_send($socket, $headers, $left, 0);
        if ($sent === false) return false;

        $left -= $sent;
        if ($sent > 0) $headers = substr($headers, $sent);
    } while ($left > 0);

    return true;
}

function wsSendClientMessage($clientID, $opcode, $message)
{
    global $wsClients;

    // check if client ready state is already closing or closed
    if ($wsClients[$clientID][2] == WS_READY_STATE_CLOSING || $wsClients[$clientID][2] == WS_READY_STATE_CLOSED) return true;

    // fetch message length
    $messageLength = strlen($message);

    // set max payload length per frame
    $bufferSize = 4096;

    // work out amount of frames to send, based on $bufferSize
    $frameCount = ceil($messageLength / $bufferSize);
    if ($frameCount == 0) $frameCount = 1;

    // set last frame variables
    $maxFrame = $frameCount - 1;
    $lastFrameBufferLength = ($messageLength % $bufferSize) != 0 ? ($messageLength % $bufferSize) : ($messageLength != 0 ? $bufferSize : 0);

    // loop around all frames to send
    for ($i = 0; $i < $frameCount; $i++) {
        // fetch fin, opcode and buffer length for frame
        $fin = $i != $maxFrame ? 0 : WS_FIN;
        $opcode = $i != 0 ? WS_OPCODE_CONTINUATION : $opcode;

        $bufferLength = $i != $maxFrame ? $bufferSize : $lastFrameBufferLength;

        // set payload length variables for frame
        if ($bufferLength <= 125) {
            $payloadLength = $bufferLength;
            $payloadLengthExtended = '';
            $payloadLengthExtendedLength = 0;
        } elseif ($bufferLength <= 65535) {
            $payloadLength = WS_PAYLOAD_LENGTH_16;
            $payloadLengthExtended = pack('n', $bufferLength);
            $payloadLengthExtendedLength = 2;
        } else {
            $payloadLength = WS_PAYLOAD_LENGTH_63;
            $payloadLengthExtended = pack('xxxxN', $bufferLength); // pack 32 bit int, should really be 64 bit int
            $payloadLengthExtendedLength = 8;
        }

        // set frame bytes
        $buffer = pack('n', (($fin | $opcode) << 8) | $payloadLength) . $payloadLengthExtended . substr($message, $i * $bufferSize, $bufferLength);

        // send frame
        $socket = $wsClients[$clientID][0];

        $left = 2 + $payloadLengthExtendedLength + $bufferLength;
        do {
            $sent = @socket_send($socket, $buffer, $left, 0);
            if ($sent === false) return false;

            $left -= $sent;
            if ($sent > 0) $buffer = substr($buffer, $sent);
        } while ($left > 0);
    }

    return true;
}

function wsSendClientClose($clientID, $status = false)
{
    global $wsClients;

    // check if client ready state is already closing or closed
    if ($wsClients[$clientID][2] == WS_READY_STATE_CLOSING || $wsClients[$clientID][2] == WS_READY_STATE_CLOSED) return true;

    // store close status
    $wsClients[$clientID][5] = $status;

    // send close frame to client
    $status = $status !== false ? pack('n', $status) : '';
    wsSendClientMessage($clientID, WS_OPCODE_CLOSE, $status);

    // set client ready state to closing
    $wsClients[$clientID][2] = WS_READY_STATE_CLOSING;
}

function wsClose($clientID)
{
    return wsSendClientClose($clientID, WS_STATUS_NORMAL_CLOSE);
}

function wsSend($clientID, $message, $binary = false)
{
    return wsSendClientMessage($clientID, $binary ? WS_OPCODE_BINARY : WS_OPCODE_TEXT, $message);
}

?>