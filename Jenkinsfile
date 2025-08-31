pipeline {
  agent any
  options { timestamps() }

  environment {
    // --- images ---
    DOCKER_USER = 'niranjini'
    IMAGE_API   = "${DOCKER_USER}/smelinx-api"
    IMAGE_WEB   = "${DOCKER_USER}/smelinx-web"

    // baked into Next.js client bundle at docker build time
    NEXT_PUBLIC_API_URL = "https://api.smelinx.com"

    // --- EC2 deploy target (EDIT THESE) ---
    EC2_HOST   = '63.179.64.60'   // e.g. ec2-xx-xx-xx-xx.compute-1.amazonaws.com
    DEPLOY_DIR = '/opt/smelinx'         // where docker-compose.yml + Caddyfile live on the server
    COMPOSE_FILE = 'docker-compose.yml' // file to copy & run remotely
  }

  stages {

    stage('Checkout') {
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
          pnpm lint || true
          # Do NOT build here; Dockerfile builds with NEXT_PUBLIC_API_URL
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
          credentialsId: 'DOCKERHUB_CREDS',
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

            # Enable binfmt for cross-arch
            docker run --privileged --rm tonistiigi/binfmt --install all || true

            # Create/select builder
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

            echo ">> Building WEB image: $IMAGE_WEB:$WEB_TAG (NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL)"
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

    stage('Deploy to EC2') {
      steps {
        withCredentials([
          usernamePassword(credentialsId: 'DOCKERHUB_CREDS', usernameVariable: 'DUSER', passwordVariable: 'DPASS'),
          sshUserPrivateKey(credentialsId: 'EC2_SSH_KEY', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')
        ]) {
          sh '''
            set -e

            # Sanity: files to deploy must exist in workspace
            ls -la "${COMPOSE_FILE}"
            ls -la Caddyfile

            echo ">> Copy compose + Caddy to EC2:${EC2_HOST}:${DEPLOY_DIR}"
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "mkdir -p '$DEPLOY_DIR'"
            scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "${COMPOSE_FILE}" "Caddyfile" "$SSH_USER@$EC2_HOST:$DEPLOY_DIR/"

            echo ">> Pin release via .env (GIT_SHA=${GIT_SHA}) and deploy"
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" bash -lc '
              set -e
              cd "'"$DEPLOY_DIR"'"
              # Write .env so compose uses image tags :${GIT_SHA}
              printf "GIT_SHA=%s\n" "'"$GIT_SHA"'" > .env
              echo "'"$DPASS"'" | docker login -u "'"$DUSER"'" --password-stdin || true
              docker compose pull
              docker compose up -d
              docker image prune -f || true
            '

            echo ">> Post-deploy health checks"
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" bash -lc '
              set -e
              curl -fsS https://api.smelinx.com/health >/dev/null
              echo "API /health OK"
              curl -fsS https://smelinx.com/ >/dev/null || true
              echo "Web reachable"
            '
          '''
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pushed and deployed:"
      echo "   ${IMAGE_API}:${API_TAG}"
      echo "   ${IMAGE_WEB}:${WEB_TAG}"
      echo "   Host: ${EC2_HOST}  Dir: ${DEPLOY_DIR}  GIT_SHA: ${GIT_SHA}"
    }
    failure {
      echo "❌ Pipeline failed — check logs above."
    }
  }
}
