import { NavLink as RouterNavLink, NavLinkProps, useLocation, type To } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const FORM_BUILDER_UNSAVED_KEY = "dancehub:form-builder:unsaved";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const location = useLocation();

    const getTargetPathname = (target: To): string => {
      if (typeof target === "string") {
        return target;
      }

      return target.pathname || "";
    };

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      const targetPath = getTargetPathname(to);
      const isChangingRoute = targetPath && targetPath !== location.pathname;
      const hasUnsavedFormBuilderChanges = window.localStorage.getItem(FORM_BUILDER_UNSAVED_KEY) === "1";

      if (isChangingRoute && hasUnsavedFormBuilderChanges) {
        const confirmed = window.confirm("Tienes cambios sin guardar en el Form Builder. Si sales, se perderán. ¿Quieres continuar?");
        if (!confirmed) {
          event.preventDefault();
          return;
        }
        window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
      }

      props.onClick?.(event);
    };

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onClick={handleClick}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
