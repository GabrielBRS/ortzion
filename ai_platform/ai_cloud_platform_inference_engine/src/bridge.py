"""Cola de sistema para o motor em Mojo: sockets HTTP, subprocess e filesystem.

O Mojo stdlib nao expoe sockets ainda, entao a camada de rede usa a
interoperabilidade Python nativa do Mojo. Toda a logica de decisao
(registro, roteamento, escolha de engine) vive no codigo Mojo.
"""

import json
import os
import shutil
import socket
import subprocess

_STATUS = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    404: "Not Found",
    405: "Method Not Allowed",
    500: "Internal Server Error",
    503: "Service Unavailable",
}


def make_listener(host, port, backlog=16):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((host, int(port)))
    s.listen(backlog)
    return s


def accept_request(listener, max_bytes=4 * 1024 * 1024):
    conn, _addr = listener.accept()
    conn.settimeout(120)
    data = b""
    while b"\r\n\r\n" not in data and len(data) <= max_bytes:
        chunk = conn.recv(65536)
        if not chunk:
            break
        data += chunk
    head, sep, rest = data.partition(b"\r\n\r\n")
    content_length = 0
    for line in head.split(b"\r\n"):
        if line.lower().startswith(b"content-length:"):
            try:
                content_length = int(line.split(b":", 1)[1].strip())
            except ValueError:
                content_length = 0
    while len(rest) < content_length:
        chunk = conn.recv(min(65536, content_length - len(rest)))
        if not chunk:
            break
        rest += chunk
    return conn, (head + sep + rest).decode("utf-8", "replace")


def send_json_text(conn, status, text):
    body = text.encode("utf-8")
    reason = _STATUS.get(int(status), "OK")
    header = (
        f"HTTP/1.1 {int(status)} {reason}\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        f"Content-Length: {len(body)}\r\n"
        "Connection: close\r\n\r\n"
    ).encode("utf-8")
    try:
        conn.sendall(header + body)
    finally:
        conn.close()
    return 0


def parse_json(text):
    if not text or not text.strip():
        return {}
    return json.loads(text)


def run(cmd, timeout=900):
    p = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout
    )
    return p.returncode, p.stdout, p.stderr


def which(name):
    return shutil.which(name) or ""


def exists(path):
    return os.path.exists(path)


def isdir(path):
    return os.path.isdir(path)


def listdir(path):
    try:
        return sorted(os.listdir(path))
    except OSError:
        return []
