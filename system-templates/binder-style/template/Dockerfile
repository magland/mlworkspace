FROM continuumio/miniconda3:latest

ADD workspace/environment.yml /build/environment.yml
RUN conda env create -n env1 -f /build/environment.yml
ENV PATH /opt/conda/envs/env1/bin:$PATH

ADD workspace/postBuild /build/postBuild
ADD scripts /working/scripts
WORKDIR /build
RUN echo "force"
RUN /working/scripts/post_build.sh

ADD workspace /workspace
WORKDIR /workspace

EXPOSE 8888

CMD /bin/bash -c "jupyter lab --ip=0.0.0.0 --allow-root --no-browser"
