#!/bin/bash

repo_url=https://github.com/flatironinstitute/mountainsort_examples

echo "$repo_url" > repo_url.txt
git ls-remote "$repo_url"  > repo_info.txt
docker build -t mlw_test1 .
docker run -p 8888:8888 -it mlw_test1