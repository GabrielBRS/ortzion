from std.python import PythonObject

from src.registry import Registry
from src.router import choose_engine, find_engine, find_model


def json_escape(s: String) -> String:
    var out = String()
    for cp in s.codepoints():
        var c = String(cp)
        if c == "\"":
            out += "\\\""
        elif c == "\\":
            out += "\\\\"
        elif c == "\n":
            out += "\\n"
        elif c == "\r":
            out += "\\r"
        elif c == "\t":
            out += "\\t"
        else:
            out += c
    return out


def shell_escape(s: String) -> String:
    var out = String()
    for cp in s.codepoints():
        var c = String(cp)
        if c == "\"" or c == "\\" or c == "`" or c == "$":
            out += "\\"
            out += c
        elif c == "\n":
            out += " "
        else:
            out += c
    return out


def py_escape(s: String) -> String:
    var out = String()
    for cp in s.codepoints():
        var c = String(cp)
        if c == "'" or c == "\\":
            out += "\\"
            out += c
        elif c == "\n":
            out += "\\n"
        else:
            out += c
    return out


def get_str(d: PythonObject, key: String) raises -> String:
    var s = String(d.get(key, ""))
    if s == "None":
        return ""
    return s


def is_loaded(reg: Registry, model_id: String) -> Bool:
    for i in range(len(reg.loaded)):
        if reg.loaded[i] == model_id:
            return True
    return False


def engines_json(reg: Registry) -> String:
    var out = String("[")
    for i in range(len(reg.engines)):
        var e = reg.engines[i].copy()
        if i > 0:
            out += ","
        var avail = String("false")
        if e.available:
            avail = "true"
        out += "{\"name\":\"" + json_escape(e.name)
        out += "\",\"path\":\"" + json_escape(e.path)
        out += "\",\"available\":" + avail
        out += ",\"launcher\":\"" + json_escape(e.launcher) + "\"}"
    out += "]"
    return out


def models_json(reg: Registry) -> String:
    var out = String("[")
    for i in range(len(reg.models)):
        var m = reg.models[i].copy()
        if i > 0:
            out += ","
        var loaded = String("false")
        if is_loaded(reg, m.id()):
            loaded = "true"
        out += "{\"id\":\"" + json_escape(m.id())
        out += "\",\"name\":\"" + json_escape(m.name)
        out += "\",\"family\":\"" + json_escape(m.family)
        out += "\",\"path\":\"" + json_escape(m.path)
        out += "\",\"loaded\":" + loaded + "}"
    out += "]"
    return out


def help_json() -> String:
    return String(
        "{\"service\":\"ai_cloud_platform_inference_engine\","
        "\"endpoints\":{"
        "\"GET /health\":\"status do servico\","
        "\"GET /v1/engines\":\"lista engines de /inference\","
        "\"GET /v1/models\":\"lista modelos de /models\","
        "\"POST /v1/scan\":\"re-varre /inference e /models\","
        "\"POST /v1/load\":\"{engine?, model} carrega modelo na engine\","
        "\"POST /v1/infer\":\"{engine?, model, prompt} executa inferencia\""
        "}}"
    )


def serve_command(
    engine: String, launcher: String, model_path: String, model_name: String
) -> String:
    if engine == "max-local":
        return (
            "\"" + launcher + "\" serve --model-path \"" + model_path
            + "\" --port 8000"
        )
    if engine == "ollama":
        return "ollama pull " + model_name + " && ollama serve"
    if engine == "vllm":
        return "vllm serve \"" + model_path + "\" --port 8000"
    return ""


def resolve(
    reg: Registry, d: PythonObject, need_prompt: Bool
) raises -> Tuple[Int, Int, String]:
    """Retorna (indice_modelo, indice_engine, erro). erro vazio = sucesso."""
    var model_name = get_str(d, "model")
    if model_name == "":
        return (0, 0, "missing field: model")
    if need_prompt and get_str(d, "prompt") == "":
        return (0, 0, "missing field: prompt")
    var mi = find_model(reg, model_name)
    if mi < 0:
        return (0, 0, "model not found: " + model_name)
    var engine_name = String("")
    try:
        engine_name = choose_engine(
            reg, get_str(d, "engine"), reg.models[mi].family
        )
    except e:
        return (0, 0, String(e))
    var ei = find_engine(reg, engine_name)
    if not reg.engines[ei].available:
        return (0, 0, "engine not available: " + engine_name)
    return (mi, ei, "")


def error_status(err: String) -> Int:
    if err.find("not found") >= 0:
        return 404
    if err.find("not available") >= 0:
        return 503
    return 400


def handle_load(
    mut reg: Registry, bridge: PythonObject, body: String
) raises -> Tuple[Int, String]:
    var d = bridge.parse_json(body)
    var r = resolve(reg, d, False)
    var err = r[2]
    if err != "":
        return (error_status(err), "{\"error\":\"" + json_escape(err) + "\"}")
    var model = reg.models[r[0]].copy()
    var eng = reg.engines[r[1]].copy()
    var cmd = serve_command(eng.name, eng.launcher, model.path, model.name)
    var mid = model.id()
    if not is_loaded(reg, mid):
        reg.loaded.append(mid)
    var out = String("{\"status\":\"loaded\"")
    out += ",\"engine\":\"" + json_escape(eng.name) + "\""
    out += ",\"model\":\"" + json_escape(mid) + "\""
    out += ",\"serve_command\":\"" + json_escape(cmd) + "\"}"
    return (200, out)


def handle_infer(
    mut reg: Registry, bridge: PythonObject, body: String
) raises -> Tuple[Int, String]:
    var d = bridge.parse_json(body)
    var r = resolve(reg, d, True)
    var err = r[2]
    if err != "":
        return (error_status(err), "{\"error\":\"" + json_escape(err) + "\"}")
    var model = reg.models[r[0]].copy()
    var eng = reg.engines[r[1]].copy()
    var prompt = get_str(d, "prompt")
    var cmd = String("")
    if eng.name == "max-local":
        cmd = (
            "\"" + eng.launcher + "\" generate --model-path \"" + model.path
            + "\" --prompt \"" + shell_escape(prompt) + "\""
        )
    elif eng.name == "ollama":
        cmd = (
            "ollama run \"" + shell_escape(model.name) + "\" \""
            + shell_escape(prompt) + "\""
        )
    elif eng.name == "vllm":
        cmd = (
            "python3 -c \"from vllm import LLM, SamplingParams; llm = LLM(model='"
            + py_escape(model.path)
            + "'); r = llm.generate(['" + py_escape(prompt)
            + "'], SamplingParams(max_tokens=256)); print(r[0].outputs[0].text)\""
        )
    else:
        return (
            400,
            "{\"error\":\"no adapter for engine: " + json_escape(eng.name) + "\"}",
        )
    var res = bridge.run(cmd)
    var code = Int(String(res[0]))
    var status = 200
    if code != 0:
        status = 500
    var out = String("{\"engine\":\"" + json_escape(eng.name) + "\"")
    out += ",\"model\":\"" + json_escape(model.id()) + "\""
    out += ",\"command\":\"" + json_escape(cmd) + "\""
    out += ",\"exit_code\":" + String(code)
    out += ",\"output\":\"" + json_escape(String(res[1])) + "\""
    out += ",\"stderr\":\"" + json_escape(String(res[2])) + "\"}"
    return (status, out)


def handle_request(
    mut reg: Registry, bridge: PythonObject, raw: String
) raises -> Tuple[Int, String]:
    var head = raw.copy()
    var body = String("")
    var head_end = raw.find("\r\n\r\n")
    if head_end >= 0:
        head = String(raw[byte=:head_end])
        body = String(raw[byte=head_end + 4:])
    var request_line = String(head.split("\r\n")[0])
    var parts = request_line.split(" ")
    if len(parts) < 2:
        return (400, "{\"error\":\"malformed request line\"}")
    var method = String(parts[0])
    var path = String(parts[1])
    var q = path.find("?")
    if q >= 0:
        var trimmed = String(path[byte=:q])
        path = trimmed^

    if method == "GET" and path == "/":
        return (200, help_json())
    if method == "GET" and path == "/health":
        var out = String("{\"status\":\"ok\"")
        out += ",\"service\":\"ai_cloud_platform_inference_engine\""
        out += ",\"engines\":" + String(len(reg.engines))
        out += ",\"models\":" + String(len(reg.models)) + "}"
        return (200, out)
    if method == "GET" and path == "/v1/engines":
        return (200, "{\"engines\":" + engines_json(reg) + "}")
    if method == "GET" and path == "/v1/models":
        return (200, "{\"models\":" + models_json(reg) + "}")
    if method == "POST" and path == "/v1/scan":
        reg.scan(bridge)
        var out = String("{\"status\":\"rescanned\"")
        out += ",\"engines\":" + String(len(reg.engines))
        out += ",\"models\":" + String(len(reg.models)) + "}"
        return (200, out)
    if method == "POST" and path == "/v1/load":
        return handle_load(reg, bridge, body)
    if method == "POST" and path == "/v1/infer":
        return handle_infer(reg, bridge, body)
    return (
        404,
        "{\"error\":\"not found\",\"path\":\"" + json_escape(path) + "\"}",
    )
