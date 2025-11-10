# Schematic

A Prisma generator for your project.

## Installation

```bash
pnpm install
```

## Development

Build the generator:

```bash
pnpm build
```

Watch mode for development:

```bash
pnpm dev
```

## Usage

Add the generator to your `schema.prisma` file:

```prisma
generator schematic {
  provider = "node ./dist/generator.js"
  output   = "./generated"
}
```

Then run:

```bash
npx prisma generate
```

## How it Works

This generator uses the Prisma DMMF (Data Model Meta Format) to access your schema information and generate custom output files. The main logic is in:

- `src/generator.ts` - Entry point and generator handler
- `src/generate.ts` - Core generation logic (customize this for your needs)

## Customization

Edit `src/generate.ts` to implement your custom generation logic. The `dmmf` object provides access to:

- `dmmf.datamodel.models` - Your Prisma models
- `dmmf.datamodel.enums` - Your Prisma enums
- `dmmf.datamodel.types` - Your Prisma types

## License

ISC
