pipeline {
  agent any
  options { timestamps() }

  environment {
    // --- adjust only if needed ---
    DOCKER_USER = 'niranjini'
    IMAGE_API   = "${DOCKER_USER}/smelinx-api"
    IMAGE_WEB   = "${DOCKER_USER}/smelinx-web"

    // Public, baked into the Next.js client bundle at build time
    NEXT_PUBLIC_API_URL = "https://api.smelinx.com"
  }

  stages {

    stage('Checkout (manual clone)') {
      steps {
        sh '''
          set -e
          rm -rf Smelinx_tmp || true
          git clone --depth 1 --branch main https://github.com/Niranjini-Kathiravan/Smelinx.git Smelinx_tmp
          cp -a Smelinx_tmp/. .
          rm -rf Smelinx_tmp
          git rev-parse --short=7 HEAD
        '''
      }
    }

    stage('Compute Tag') {
      steps {
        script {
          env.GIT_SHA = sh(script: "git rev-parse --short=7 HEAD", returnStdout: true).trim()
          env.API_TAG = env.GIT_SHA
          env.WEB_TAG = env.GIT_SHA
          echo "Using tag: ${env.GIT_SHA}"
          echo "NEXT_PUBLIC_API_URL = ${env.NEXT_PUBLIC_API_URL}"
        }
      }
    }

    stage('Build & Test API (Go)') {
      steps {
        sh '''
          set -e
          cat > smelinx-api/ci_api.sh <<'EOF'
          set -e
          go version
          go mod tidy
          go build ./...
          go test ./... -v
          EOF
          chmod +x smelinx-api/ci_api.sh

          docker run --rm \
            -v "$PWD":/ws \
            -w /ws/smelinx-api \
            golang:1.25 \
            bash /ws/smelinx-api/ci_api.sh
        '''
      }
    }

    stage('Web deps + lint (Node)') {
      steps {
        sh '''
          set -e
          cat > smelinx-web/ci_web.sh <<'EOF'
          set -e
          corepack enable
          corepack prepare pnpm@latest --activate
          pnpm install --frozen-lockfile
          pnpm -v
          # Optional: run lint/tests if you have them
          pnpm lint || true
          # Do NOT build here. The only build that matters is inside the Dockerfile,
          # where NEXT_PUBLIC_API_URL is baked via --build-arg.
          EOF
          chmod +x smelinx-web/ci_web.sh

          docker run --rm \
            -v "$PWD":/ws \
            -w /ws/smelinx-web \
            node:20-bullseye \
            bash /ws/smelinx-web/ci_web.sh
        '''
      }
    }

    stage('Docker Build & Push (multi-arch)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'DOCKERHUB_CREDS',   // Jenkins credential (Docker Hub user + token/password)
          usernameVariable: 'DUSER',
          passwordVariable: 'DPASS'
        )]) {
          sh '''
            set -e

            echo "$DPASS" | docker login -u "$DUSER" --password-stdin

            # Ensure buildx exists (install if missing)
            if ! docker buildx version >/dev/null 2>&1; then
              echo "Installing docker buildx plugin..."
              mkdir -p /usr/local/lib/docker/cli-plugins /usr/libexec/docker/cli-plugins || true
              BUILDX_VER="v0.13.1"
              ARCH="$(uname -m)"
              case "$ARCH" in
                x86_64|amd64)   BUILDX_ASSET="buildx-${BUILDX_VER}.linux-amd64" ;;
                aarch64|arm64)  BUILDX_ASSET="buildx-${BUILDX_VER}.linux-arm64" ;;
                *) echo "Unsupported arch: $ARCH"; exit 1 ;;
              esac
              curl -fsSL "https://github.com/docker/buildx/releases/download/${BUILDX_VER}/${BUILDX_ASSET}" \
                -o /usr/local/lib/docker/cli-plugins/docker-buildx
              chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
              docker buildx version
            fi

            # Enable binfmt for cross builds
            docker run --privileged --rm tonistiigi/binfmt --install all || true

            # Create/select a builder
            docker buildx create --name ci-builder --driver docker-container --use >/dev/null 2>&1 || \
              docker buildx use ci-builder
            docker buildx inspect --bootstrap

            echo ">> Building API image: $IMAGE_API:$API_TAG"
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              -t $IMAGE_API:$API_TAG \
              -t $IMAGE_API:latest \
              smelinx-api \
              --push

            echo ">> Building WEB image: $IMAGE_WEB:$WEB_TAG with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
              -t $IMAGE_WEB:$WEB_TAG \
              -t $IMAGE_WEB:latest \
              smelinx-web \
              --push
          '''
        }
      }
    }
  }

  post {
    success {
      echo "✅ Multi-arch images pushed:"
      echo "  - ${IMAGE_API}:${API_TAG} and :latest"
      echo "  - ${IMAGE_WEB}:${WEB_TAG} and :latest"
      echo "👉 Deploy these tags on EC2 via docker compose (pull & up -d)."
    }
    failure {
      echo "❌ Pipeline failed — check the last stage logs."
    }
  }
}
