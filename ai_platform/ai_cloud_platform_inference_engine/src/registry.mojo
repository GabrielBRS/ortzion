from std.python import PythonObject


struct EngineInfo(Copyable, Movable):
    var name: String
    var path: String
    var available: Bool
    var launcher: String

    def __init__(
        out self, name: String, path: String, available: Bool, launcher: String
    ):
        self.name = name
        self.path = path
        self.available = available
        self.launcher = launcher


struct ModelInfo(Copyable, Movable):
    var name: String
    var family: String
    var path: String

    def __init__(out self, name: String, family: String, path: String):
        self.name = name
        self.family = family
        self.path = path

    def id(self) -> String:
        return self.family + "/" + self.name


struct Registry:
    """Catalogo vivo de engines (/inference) e modelos (/models)."""

    var root: String
    var engines: List[EngineInfo]
    var models: List[ModelInfo]
    var loaded: List[String]

    def __init__(out self, root: String):
        self.root = root
        self.engines = List[EngineInfo]()
        self.models = List[ModelInfo]()
        self.loaded = List[String]()

    def scan(mut self, bridge: PythonObject) raises:
        self.engines.clear()
        self.models.clear()
        self._scan_engines(bridge)
        self._scan_models(bridge)

    def _scan_engines(mut self, bridge: PythonObject) raises:
        var base = self.root + "/inference"
        var names = List[String]()
        names.append("max-local")
        names.append("ollama")
        names.append("vllm")
        for i in range(len(names)):
            var name = names[i].copy()
            var path = base + "/" + name
            if not Bool(bridge.isdir(path)):
                continue
            var launcher = String("")
            if name == "max-local":
                launcher = path + "/.pixi/envs/default/bin/max"
            elif name == "ollama":
                launcher = String(bridge.which("ollama"))
            elif name == "vllm":
                launcher = String(bridge.which("vllm"))
            var available = launcher != "" and Bool(bridge.exists(launcher))
            self.engines.append(EngineInfo(name, path, available, launcher))

    def _scan_models(mut self, bridge: PythonObject) raises:
        var base = self.root + "/models"
        var families = bridge.listdir(base)
        var nf = Int(String(families.__len__()))
        for i in range(nf):
            var family = String(families[i])
            var fpath = base + "/" + family
            if not Bool(bridge.isdir(fpath)):
                continue
            if Bool(bridge.exists(fpath + "/config.json")):
                self.models.append(ModelInfo(family, family, fpath))
                continue
            var entries = bridge.listdir(fpath)
            var ne = Int(String(entries.__len__()))
            for j in range(ne):
                var entry = String(entries[j])
                var epath = fpath + "/" + entry
                if Bool(bridge.isdir(epath)):
                    self.models.append(ModelInfo(entry, family, epath))
