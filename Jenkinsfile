pipeline {
  agent any
  options { timestamps() }

  environment {
    DOCKER_USER = 'niranjini'
    IMAGE_API   = "${DOCKER_USER}/smelinx-api"
    IMAGE_WEB   = "${DOCKER_USER}/smelinx-web"
    NEXT_PUBLIC_API_URL = "https://api.smelinx.com"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Compute Tag') {
      steps {
        script {
          env.GIT_SHA = sh(script: "git rev-parse --short=7 HEAD", returnStdout: true).trim()
          env.API_TAG = env.GIT_SHA
          env.WEB_TAG = env.GIT_SHA
        }
      }
    }

    stage('Build & Test API') {
      agent {
        docker {
          image 'golang:1.22'
          reuseNode true
        }
      }
      steps {
        sh '''
          set -e
          cd smelinx-api
          go version
          go mod tidy
          go build ./...
          go test ./... -v
        '''
      }
    }

    stage('Build WEB') {
      agent {
        docker {
          image 'node:20-bullseye'
          reuseNode true
        }
      }
      steps {
        sh '''
          set -e
          cd smelinx-web
          corepack enable
          corepack prepare pnpm@latest --activate
          pnpm install --frozen-lockfile
          NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" pnpm build
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          set -e
          docker version

          docker build -t $IMAGE_API:$API_TAG smelinx-api

          docker build \
            --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
            -t $IMAGE_WEB:$WEB_TAG \
            smelinx-web

          docker tag $IMAGE_API:$API_TAG $IMAGE_API:latest
          docker tag $IMAGE_WEB:$WEB_TAG $IMAGE_WEB:latest
        '''
      }
    }

    stage('Docker Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'DOCKERHUB_CREDS',
          usernameVariable: 'DUSER',
          passwordVariable: 'DPASS'
        )]) {
          sh '''
            set -e
            echo "$DPASS" | docker login -u "$DUSER" --password-stdin
            docker push $IMAGE_API:$API_TAG
            docker push $IMAGE_API:latest
            docker push $IMAGE_WEB:$WEB_TAG
            docker push $IMAGE_WEB:latest
          '''
        }
      }
    }
  }

  post {
    success { echo "✅ Pushed $IMAGE_API:$API_TAG and $IMAGE_WEB:$WEB_TAG" }
    failure { echo "❌ Build/push failed — check logs." }
  }
}
