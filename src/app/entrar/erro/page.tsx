export default function ErroDeEntrada() {
  return (
    <main className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-text text-xl font-semibold">
          Link de acesso inválido
        </h1>
        <p className="text-text-body mt-2">
          O link expirou ou já foi usado. Volte ao login e tente novamente.
        </p>
        {/* /entrar/iniciar gera um state novo: voltar pelo historico do
            navegador reusaria o state antigo, ja descartado no primeiro uso. */}
        <a
          href="/entrar/iniciar"
          className="text-text-brand mt-6 inline-block font-semibold underline underline-offset-4"
        >
          Voltar ao login
        </a>
      </div>
    </main>
  );
}
