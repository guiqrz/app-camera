import { redirect } from "next/navigation";

/** A raiz nao tem conteudo proprio: a porta de entrada e' "Minhas Aulas". */
export default function Home() {
  redirect("/aulas");
}
