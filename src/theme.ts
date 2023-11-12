import { ThemeOptions, createTheme } from "@mui/material/styles";

const DefaultThemeOptions: ThemeOptions = {
  typography: {
    allVariants: {
      fontFamily: ["Roboto", "Helvetica", "Arial"].join(","),
      fontSize: 16,
    },
    htmlFontSize: 16,
  },
  palette: {
    primary: {
      light: "#7a61cb",
      main: "#483699",
      dark: "#0c0e6a",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#525252",
      main: "#2a2a2a",
      dark: "#000000",
      contrastText: "#ffffff",
    },
  },
};

export const PurpleTheme = createTheme(DefaultThemeOptions);

export const DarkPurpleTheme = createTheme({
  ...DefaultThemeOptions,
  palette: {
    mode: "dark",
  },
});
