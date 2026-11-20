import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requerirSesion, tienePermiso } from "@/lib/dal";
import { menuPara } from "@/lib/menu";
import { MenuCliente } from "./menu-cliente";

export async function MenuLateral() {
  const ctx = await requerirSesion();
  if (ctx.usuario.debeCambiarContrasena) redirect("/cambiar-contrasena");
  const contraido = (await cookies()).get("menu_contraido")?.value === "1";
  return (
    <MenuCliente
      areas={menuPara((modulo) => tienePermiso(ctx, modulo, "ver"))}
      usuario={{ nombre: ctx.usuario.nombre, email: ctx.usuario.email }}
      contraidoInicial={contraido}
      empresa={ctx.cliente.nombre}
    />
  );
}
