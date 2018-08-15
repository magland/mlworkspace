#!/bin/bash

set -e

repo_url=$1

git clone "${repo_url}" "${WORKSPACE_DIR}/workspace"

post_build_fname="${WORKSPACE_DIR}/workspace/postBuild"
if [ ! -f "${post_build_fname}" ]; then
    touch "${post_build_fname}"
fi

cp -r template/* "${WORKSPACE_DIR}/"
#echo "$repo_url" > "${WORKSPACE_DIR}/template/repo_url.txt"
#git ls-remote "$repo_url"  > "${WORKSPACE_DIR}/template/repo_info.txt"

cd "${WORKSPACE_DIR}"

image_name="mlw_binder_style_${WORKSPACE_NAME}"
container_name="${image_name}_container"

docker build -t "${image_name}" .

cmd="/bin/bash -c \"jupyter lab --ip=0.0.0.0 --allow-root --no-browser --NotebookApp.token=''\""

cmd2="docker run -p 8888:8888 --name=${container_name} -d -t ${image_name} ${cmd}"
echo $cmd2
/bin/bash -c "${cmd2}"