function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

export default function PageShell({
  as: Root = "div",
  className = "",
  children,
}) {
  return <Root className={joinClasses("page-shell", className)}>{children}</Root>;
}
