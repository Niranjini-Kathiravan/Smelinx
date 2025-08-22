package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	DBUrl string `mapstructure:"DB_URL"`
	Port  string `mapstructure:"PORT"`
}

func LoadConfig() (Config, error) {
	var cfg Config
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	err := viper.Unmarshal(&cfg)
	return cfg, err
}
