PYTHON ?= python3
VENV ?= $(HOME)/venvs/campusroi

.PHONY: setup install-python install-web dev build

setup: install-python install-web

install-python:
	uv venv $(VENV) --python $(PYTHON)
	. $(VENV)/bin/activate && uv pip install -e ".[dev]"

install-web:
	pnpm install

dev:
	pnpm --dir apps/web dev

build:
	pnpm --dir apps/web build
