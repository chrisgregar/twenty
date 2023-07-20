import {
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { subject } from '@casl/ability';

import { IAbilityHandler } from 'src/ability/interfaces/ability-handler.interface';

import { PrismaService } from 'src/database/prisma.service';
import { AbilityAction } from 'src/ability/ability.action';
import { AppAbility } from 'src/ability/ability.factory';
import { PipelineStageWhereInput } from 'src/core/@generated/pipeline-stage/pipeline-stage-where.input';
import { UpdateOnePipelineStageArgs } from 'src/core/@generated/pipeline-stage/update-one-pipeline-stage.args';
import { assert } from 'src/utils/assert';

class PipelineStageArgs {
  where?: PipelineStageWhereInput;
}

@Injectable()
export class ManagePipelineStageAbilityHandler implements IAbilityHandler {
  async handle(ability: AppAbility) {
    return ability.can(AbilityAction.Manage, 'PipelineStage');
  }
}

@Injectable()
export class ReadPipelineStageAbilityHandler implements IAbilityHandler {
  handle(ability: AppAbility) {
    return ability.can(AbilityAction.Read, 'PipelineStage');
  }
}

@Injectable()
export class CreatePipelineStageAbilityHandler implements IAbilityHandler {
  handle(ability: AppAbility) {
    return ability.can(AbilityAction.Create, 'PipelineStage');
  }
}

@Injectable()
export class UpdatePipelineStageAbilityHandler implements IAbilityHandler {
  constructor(private readonly prismaService: PrismaService) {}

  async handle(ability: AppAbility, context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs<UpdateOnePipelineStageArgs>();
    const pipelineStage = await this.prismaService.pipelineStage.findFirst({
      where: args.where,
    });
    assert(pipelineStage, '', NotFoundException);

    const relations = [
      { name: 'pipeline', model: 'pipeline' },
      { name: 'pipelineProgresses', model: 'pipelineProgress' },
    ];
    const relationNames = relations.map((item) => item.name);
    const actions = ['set', 'disconnect', 'connect'];

    for (const [key, arg] of Object.entries(args.data)) {
      const index = relationNames.indexOf(key);

      if (index !== -1) {
        for (const action of actions) {
          const model = relations[index].model;
          if (!arg[action]) {
            continue;
          }

          const array = !Array.isArray(arg[action])
            ? [arg[action]]
            : arg[action];
          const ids = array.map((item) => item.id);

          if (ids.lenght < 0) {
            continue;
          }

          const items = await this.prismaService[model].findMany({
            where: {
              id: {
                in: ids,
              },
              workspaceId: pipelineStage.workspaceId,
            },
          });

          if (items.length !== ids.length) {
            return false;
          }
        }
      }
    }

    return ability.can(
      AbilityAction.Update,
      subject('PipelineStage', pipelineStage),
    );
  }
}

@Injectable()
export class DeletePipelineStageAbilityHandler implements IAbilityHandler {
  constructor(private readonly prismaService: PrismaService) {}

  async handle(ability: AppAbility, context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs<PipelineStageArgs>();
    const pipelineStage = await this.prismaService.pipelineStage.findFirst({
      where: args.where,
    });
    assert(pipelineStage, '', NotFoundException);

    return ability.can(
      AbilityAction.Delete,
      subject('PipelineStage', pipelineStage),
    );
  }
}
