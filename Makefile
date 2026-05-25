.PHONY: up test build deploy

up:
	npm install
	npm run dev

test:
	npm test

build:
	npm run build

deploy:
	npm run deploy
