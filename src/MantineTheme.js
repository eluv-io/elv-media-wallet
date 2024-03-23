import {createTheme, em} from "@mantine/core";

const MantineTheme = createTheme({
  /** Put your mantine theme override here */
  fontSizes: {
    xs: em(10),
    sm: em(11),
    md: em(14),
    lg: em(16),
    xl: em(20)
  }
});

export default MantineTheme;
