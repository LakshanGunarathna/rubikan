# Use python 3.9 which has good compatibility with C extensions
FROM python:3.9-slim

# Install C compiler for kociemba and ida search extensions
RUN apt-get update && apt-get install -y gcc g++ make git wget ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone the dwalton76 repo
RUN git clone https://github.com/dwalton76/rubiks-cube-NxNxN-solver.git

# Manually compile the C extensions to avoid 'make init' issues with pip editable installs
WORKDIR /app/rubiks-cube-NxNxN-solver
RUN gcc -O3 -o ida_search_via_graph rubikscubennnsolver/ida_search_core.c \
    rubikscubennnsolver/rotate_xxx.c rubikscubennnsolver/ida_search_666.c \
    rubikscubennnsolver/ida_search_777.c rubikscubennnsolver/ida_search_via_graph.c -lm

# Install kociemba per solver instructions
WORKDIR /app
RUN git clone https://github.com/dwalton76/kociemba.git
WORKDIR /app/kociemba/kociemba/ckociemba
RUN make && make install

# Also symlink kociemba so it's in PATH for the python script
RUN ln -s /usr/local/bin/kociemba /usr/bin/kociemba

# Setup our Flask API wrapper
WORKDIR /app
COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
