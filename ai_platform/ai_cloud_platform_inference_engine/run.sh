#!/bin/bash
# Sobe o ai_cloud_platform_inference_engine (Mojo) com o ambiente do max-local.
# Uso: ./run.sh [--port PORTA]   (padrao: 7880, ou variavel PORT)
set -e
cd "$(dirname "$0")"

export CONDA_PREFIX="$PWD/inference/max-local/.pixi/envs/default"
export MODULAR_HOME="$CONDA_PREFIX/share/max"
export MODULAR_MOJO_MAX_IMPORT_PATH="$CONDA_PREFIX/lib/mojo"
export LD_LIBRARY_PATH="$CONDA_PREFIX/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

if [ ! -x ./inference-engine ]; then
    echo "compilando inference-engine..."
    "$CONDA_PREFIX/bin/mojo" build main.mojo -o inference-engine
fi

exec ./inference-engine "$@"
