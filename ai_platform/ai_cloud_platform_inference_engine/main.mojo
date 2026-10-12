from std.python import Python

from src.handler import handle_request
from src.registry import Registry


def main() raises:
    var sys = Python.import_module("sys")
    _ = sys.path.insert(0, ".")
    var osmod = Python.import_module("os")
    var bridge = Python.import_module("src.bridge")

    # A interop Python do Mojo exporta PYTHONEXECUTABLE apontando para o
    # python do sistema, o que quebraria os subprocessos das engines
    # (ex.: o python do env pixi do max-local perde o site-packages).
    _ = osmod.environ.pop("PYTHONEXECUTABLE", "")

    var port = String(osmod.environ.get("PORT", "7880"))
    var argv = sys.argv
    var n = Int(String(argv.__len__()))
    var i = 0
    while i < n:
        if String(argv[i]) == "--port" and i + 1 < n:
            port = String(argv[i + 1])
        i += 1

    var root = String(osmod.getcwd())
    var reg = Registry(root)
    reg.scan(bridge)
    print(
        "registry:",
        len(reg.engines),
        "engines,",
        len(reg.models),
        "models found",
    )

    var listener = bridge.make_listener("0.0.0.0", port)
    print(
        "ai_cloud_platform_inference_engine listening on 0.0.0.0:"
        + port
    )
    while True:
        var item = bridge.accept_request(listener)
        var conn = item[0]
        var raw = String(item[1])
        var status = 500
        var resp = String("{\"error\":\"internal error\"}")
        try:
            var r = handle_request(reg, bridge, raw)
            status = r[0]
            resp = r[1]
        except e:
            status = 500
            resp = "{\"error\":\"internal error: " + String(e) + "\"}"
        _ = bridge.send_json_text(conn, status, resp)
