build:
	docker build --platform=linux/amd64 -t codegen-sandbox .

run:
	docker rm -f codegen-sandbox || true
	docker run \
		--platform=linux/amd64 \
		-p 8080:8080 \
		-p 3000:3000 \
		--name codegen-sandbox \
		-e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
		codegen-sandbox
