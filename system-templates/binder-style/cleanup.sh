#!/bin/bash

set -e

echo "Cleaning up."

image_name="mlw_binder_style_${WORKSPACE_NAME}"
container_name="${image_name}_container"


docker stop "${container_name}"
docker rm "${container_name}"