"use client";

import { createContext, useContext } from "react";

export type NavTheme = "light" | "dark";

// "light" = fondo claro → texto NEGRO
// "dark"  = fondo oscuro/imagen → texto BLANCO
export const NavThemeContext = createContext<NavTheme>("light");
export const useNavTheme = () => useContext(NavThemeContext);
