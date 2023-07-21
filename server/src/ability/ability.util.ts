import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/database/prisma.service';

interface Relation {
  name: string;
  model: Prisma.ModelName;
}

type OperationType =
  | 'create'
  | 'connectOrCreate'
  | 'upsert'
  | 'createMany'
  | 'set'
  | 'disconnect'
  | 'delete'
  | 'connect'
  | 'update'
  | 'updateMany'
  | 'deleteMany';

interface Options {
  args: any;
  relations: Relation[];
  operations: OperationType[];
  workspaceId: string;
}

// Ugly stuff, need to find a best way to handle it
export async function checkRelationPermission(
  prismaService: PrismaService,
  options: Options,
) {
  const relationNames = options.relations.map((item) => item.name);

  for (const [key, argument] of Object.entries(options.args.data)) {
    const arg = argument as any;
    const index = relationNames.indexOf(key);

    if (index !== -1) {
      for (const operation of options.operations) {
        const modelName = options.relations[index].model;
        const model = modelName[0].toLowerCase() + modelName.slice(1);
        if (!arg[operation]) {
          continue;
        }

        const array = !Array.isArray(arg[operation])
          ? [arg[operation]]
          : arg[operation];
        const ids = array.map((item) => item.id);

        if (ids.lenght < 0) {
          continue;
        }

        const items = await prismaService.client[model].findMany({
          where: {
            id: {
              in: ids,
            },
            workspaceId: options.workspaceId,
          },
        });

        if (items.length !== ids.length) {
          return false;
        }
      }
    }
  }
}
