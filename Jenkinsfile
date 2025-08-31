pipeline {
  agent any
  options { timestamps() }

  environment {
    // --- change only if needed ---
    DOCKER_USER = 'niranjini'
    IMAGE_API   = "${DOCKER_USER}/smelinx-api"
    IMAGE_WEB   = "${DOCKER_USER}/smelinx-web"

    // Next.js build-time public env for your web image
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
        }
      }
    }

    stage('Build & Test API (in Go container)') {
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

    stage('Build WEB (in Node container)') {
      steps {
        sh '''
          set -e
          cat > smelinx-web/ci_web.sh <<'EOF'
          set -e
          corepack enable
          corepack prepare pnpm@latest --activate
          pnpm install --frozen-lockfile
          NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" pnpm build
          EOF
          chmod +x smelinx-web/ci_web.sh

          docker run --rm \
            -e NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
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
          credentialsId: 'DOCKERHUB_CREDS',   // Jenkins cred (username/password or token)
          usernameVariable: 'DUSER',
          passwordVariable: 'DPASS'
        )]) {
          sh '''
            set -e

            echo "$DPASS" | docker login -u "$DUSER" --password-stdin

            # --- Install Buildx plugin if missing (portable paths) ---
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

            # --- Enable binfmt for cross-arch builds ---
            docker run --privileged --rm tonistiigi/binfmt --install all || true

            # --- Create/select builder (docker-container driver) ---
            docker buildx create --name ci-builder --driver docker-container --use >/dev/null 2>&1 || \
              docker buildx use ci-builder
            docker buildx inspect --bootstrap

            # --- Build & push API (amd64 + arm64) ---
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              -t $IMAGE_API:$API_TAG \
              -t $IMAGE_API:latest \
              smelinx-api \
              --push

            # --- Build & push WEB (amd64 + arm64) ---
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
    }
    failure {
      echo "❌ Pipeline failed — check the last stage logs."
    }
  }
}
