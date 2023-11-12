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
      dark: "#7a61cb",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#525252",
      main: "#2a2a2a",
      dark: "#525252",
      contrastText: "#ffffff",
    },
  },
};

export const PurpleTheme = createTheme(DefaultThemeOptions);

export const DarkPurpleTheme = createTheme({
  ...DefaultThemeOptions,
  palette: {
    ...DefaultThemeOptions.palette,
    mode: "dark",
  },
});
