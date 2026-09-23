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
      </div>
    </main>
  );
}
