import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;
