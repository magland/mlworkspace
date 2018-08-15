#!/bin/bash

set -e

echo "Cleaning up."

env_name="mlwenv_${WORKSPACE_NAME}"
conda env remove -n "${env_name}"

