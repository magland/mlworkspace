#!/bin/bash

set -e

env_name="mlwenv_${WORKSPACE_NAME}"

repo_url=https://github.com/flatironinstitute/mountainsort_examples

git clone "${repo_url}" "${WORKSPACE_DIR}/workspace"

conda env create -n "${env_name}" -f "${WORKSPACE_DIR}/workspace/environment.yml"
export PATH="${CONDA_PREFIX}/envs/${env_name}/bin:$PATH"

cd "${WORKSPACE_DIR}/workspace"
bash ${TEMPLATE_DIR}/template/scripts/post_build.sh

