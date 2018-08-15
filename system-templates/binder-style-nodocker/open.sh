#!/bin/bash

set -e

env_name="mlwenv_${WORKSPACE_NAME}"
export PATH="${CONDA_PREFIX}/envs/${env_name}/bin:$PATH"

cd "${WORKSPACE_DIR}/workspace"

jupyter lab

#echo "http://localhost:8888/lab"