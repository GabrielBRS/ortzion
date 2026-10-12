from src.registry import Registry


def find_engine(reg: Registry, name: String) -> Int:
    for i in range(len(reg.engines)):
        if reg.engines[i].name == name:
            return i
    return -1


def find_model(reg: Registry, name: String) -> Int:
    """Aceita "nome" (Qwen2.5-0.5B-Instruct) ou "familia/nome" (qwenn/Qwen2.5-0.5B-Instruct)."""
    for i in range(len(reg.models)):
        if reg.models[i].name == name or reg.models[i].id() == name:
            return i
    return -1


def choose_engine(reg: Registry, requested: String, family: String) raises -> String:
    """Escolhe a engine: a pedida pelo cliente, ou a melhor para a familia do modelo."""
    if requested != "":
        if find_engine(reg, requested) < 0:
            raise Error("unknown engine: " + requested)
        return requested
    if family == "ollama" and find_engine(reg, "ollama") >= 0:
        return "ollama"
    if family == "embeddings":
        if find_engine(reg, "vllm") >= 0:
            return "vllm"
        if find_engine(reg, "max-local") >= 0:
            return "max-local"
    else:
        if find_engine(reg, "max-local") >= 0:
            return "max-local"
        if find_engine(reg, "vllm") >= 0:
            return "vllm"
        if find_engine(reg, "ollama") >= 0:
            return "ollama"
    if len(reg.engines) > 0:
        return reg.engines[0].name.copy()
    raise Error("no inference engine registered under /inference")
