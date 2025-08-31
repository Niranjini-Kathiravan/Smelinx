pipeline {
  agent any
  options { timestamps() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Smoke Test') {
      steps {
        sh '''
          set -e
          echo "Repo checked out at:"
          pwd
          echo "List files:"
          ls -la
          echo "Git SHA:"
          git rev-parse --short=7 HEAD
        '''
      }
    }
  }

  post {
    success { echo '✅ Minimal pipeline works.' }
    failure { echo '❌ Minimal pipeline failed — check logs.' }
  }
}
