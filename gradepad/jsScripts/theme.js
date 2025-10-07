export function setupThemeSelector() {
    const themes = {
      default: {
        "--bg-image": "url('../assets/backgrounds/default_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#A3CEF1",
        "--table-header-bg": "#A3CEF1",
        "--table-row-alt-bg": "#f5f5f5",
        "--final-grade-bg": "#A3CEF1",
      },
      waterloo: {
        "--bg-image": "url('../assets/backgrounds/waterloo_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#fed34c",
        "--table-header-bg": "#fed34c",
        "--table-row-alt-bg": "#e5e5e5",
        "--final-grade-bg": "#fff9c4",
      },
      pastel: {
        "--bg-image": "url('../assets/backgrounds/purple_background.png')",
        "--bg-color": "#fef6ff",
        "--text-color": "#3e3e3e",
        "--button-bg-color": "#ffc1cc",
        "--table-header-bg": "#d8bfd8",
        "--table-row-alt-bg": "#fdf1f9",
        "--final-grade-bg": "#e0bbff",
      },
      forest: {
        "--bg-image": "url('../assets/backgrounds/forest.png')",
        "--bg-color": "#f0f5f1",
        "--text-color": "#2e3d30",
        "--button-bg-color": "#81c784",
        "--table-header-bg": "#a5d6a7",
        "--table-row-alt-bg": "#e8f5e9",
        "--final-grade-bg": "#c8e6c9",
      },
      purple: {
        "--bg-image": "url('../assets/backgrounds/purple_background.png')",
        "--bg-color": "#ffffff",
        "--text-color": "#000000",
        "--button-bg-color": "#c77dff",
        "--table-header-bg": "#9d4edd",
        "--table-row-alt-bg": "#f2ebfb",
        "--final-grade-bg": "#9d4edd"
      }
    };
  
    const themeSelector = document.getElementById("themeSelector");
    if (themeSelector) {
      themeSelector.addEventListener("change", (e) => {
        const theme = themes[e.target.value];
        for (let variable in theme) {
          document.documentElement.style.setProperty(variable, theme[variable]);
        }
      });
    }
  }
  