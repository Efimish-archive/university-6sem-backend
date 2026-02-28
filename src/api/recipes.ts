import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, like, inArray, desc, asc, sql } from "drizzle-orm";
import { context } from "@/context";

const Id = z.int32().min(0);

const RecipeRead = z.object({
  id: Id,
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
  author: z.object({
    id: Id,
    firstName: z.string(),
    lastName: z.string(),
  }),
  cuisine: z.object({
    id: Id,
    name: z.string(),
  }),
  allergens: z.object({
    id: Id,
    name: z.string(),
  }).array(),
  ingredients: z.object({
    id: Id,
    quantity: z.int32().min(1),
    measurement: z.enum(schema.MeasurementEnum),
    name: z.string(),
  }).array(),
});

const RecipeCreate = z.object({
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
  cuisineId: Id,
  allergenIds: Id.array(),
  ingredients: z.object({
    ingredientId: Id,
    quantity: z.int32().min(1),
    measurement: z.enum(schema.MeasurementEnum),
  }).array(),
});

const Params = z.object({
  id: z.coerce.number(),
});

const Message = z.object({
  message: z.string(),
});

const Error = z.object({
  error: z.string(),
});

const Pagination = z.object({
  page: z.coerce.number().min(1).default(1),
  size: z.coerce.number().min(1).max(10).default(10),
});

const Filters = z.object({
  name__like: z.string(),
  ingredientId: z.coerce.number().array()
    .or(z.coerce.number().transform(n => [n])),
  sort: z.string(),
}).partial();

const baseQuery = {
  with: {
    author: true,
    cuisine: true,
    recipeAllergens: {
      with: {
        allergen: true,
      },
    },
    recipeIngredients: {
      with: {
        ingredient: true,
      },
    },
  },
} satisfies Parameters<typeof db.query.recipes.findFirst>[0];

function serializeRecipe(recipe: NonNullable<Awaited<ReturnType<typeof db.query.recipes.findFirst<typeof baseQuery>>>>): z.infer<typeof RecipeRead> {
  const { cuisineId, author, recipeAllergens, recipeIngredients, ...rest } = recipe;

  return {
    ...rest,
    author: {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
    },
    allergens: recipe.recipeAllergens.map((ra) => ra.allergen),
    ingredients: recipe.recipeIngredients.map((ri) => ({
      id: ri.ingredient.id,
      quantity: ri.quantity,
      measurement: ri.measurement,
      name: ri.ingredient.name,
    })),
  };
}

export const recipesRouter = new Elysia({ prefix: "/recipes" })
  .use(context)
  .get("", async ({ query, status }) => {
    const filters = [];

    if (query.name__like) filters.push(
      like(schema.recipes.title, `%${query.name__like}%`)
    );

    if (query.ingredientId?.length) {
      const ids = query.ingredientId;

      const subquery = db
        .select({
          recipeId: schema.recipeIngredients.recipeId,
        })
        .from(schema.recipeIngredients)
        .where(
          inArray(schema.recipeIngredients.ingredientId, ids)
        )
        .groupBy(schema.recipeIngredients.recipeId)
        .having(
          sql`count(distinct ${schema.recipeIngredients.ingredientId}) = ${ids.length}`
        );

      filters.push(
        inArray(schema.recipes.id, subquery)
      );

      // ----- ВАРИАНТ 2: РЕЦЕПТЫ С ЛЮБЫМ ИЗ ИНГРЕДИЕНТОВ -----
      // filters.push(
      //   exists(
      //     db.select()
      //       .from(schema.recipeIngredients)
      //       .where(
      //         and(
      //           eq(
      //             schema.recipeIngredients.recipeId,
      //             schema.recipes.id
      //           ),
      //           inArray(
      //             schema.recipeIngredients.ingredientId,
      //             query.ingredientId
      //           ),
      //         )
      //       )
      //   )
      // );
    }

    let orderBy;

    if (query.sort) {
      const isDesc = query.sort.startsWith("-");
      const field = isDesc ? query.sort.slice(1) : query.sort;

      type Column = keyof typeof schema.recipes.$inferSelect;

      if (field in schema.recipes) {
        orderBy = isDesc
          ? desc(schema.recipes[field as Column])
          : asc(schema.recipes[field as Column]);
      } else return status(400, {
        error: "sort not found",
      });
    }

    const recipes = await db.query.recipes.findMany({
      ...baseQuery,
      offset: ((query.page - 1) * query.size),
      limit: query.size,
      where: filters.length ? and(...filters) : undefined,
      orderBy,
    });

    return recipes.map(serializeRecipe);
  }, {
    query: Pagination.extend({ ...Filters.shape }),
    response: {
      200: RecipeRead.array(),
      400: Error,
    },
  })
  .post("", async ({ body, auth: { userId }, status }) => {
    return await db.transaction(async (tx) => {
      const [newRecipe] = await tx
        .insert(schema.recipes)
        .values({
          ...body,
          authorId: userId
        })
        .returning();

      body.allergenIds.length > 0 && await tx.insert(schema.recipeAllergens).values(
        body.allergenIds.map((allergenId) => ({
          recipeId: newRecipe.id,
          allergenId
        }))
      );

      body.ingredients.length > 0 && await tx.insert(schema.recipeIngredients).values(
        body.ingredients.map((ingredient) => ({
          recipeId: newRecipe.id,
          ...ingredient,
        }))
      );

      const recipe = await tx.query.recipes.findFirst({
        ...baseQuery,
        where: eq(schema.recipes.id, newRecipe.id),
      });

      if (!recipe) return tx.rollback();

      return status(201, serializeRecipe(recipe));
    });
  }, {
    body: RecipeCreate,
    response: { 201: RecipeRead },
    auth: true,
  })
  .get("/:id", async ({ params: { id }, status }) => {
    const recipe = await db.query.recipes.findFirst({
      ...baseQuery,
      where: eq(schema.recipes.id, id),
    });
    if (!recipe) return status(404, {
      error: "recipe with this id not found",
    });
    return serializeRecipe(recipe);
  }, {
    params: Params,
    response: {
      200: RecipeRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, auth: { userId }, status }) => {
    return await db.transaction(async (tx) => {
      const wasRecipe = await tx.query.recipes.findFirst({
        where: eq(schema.recipes.id, id),
      });
      if (!wasRecipe) return status(404, {
        error: "recipe with this id not found",
      });
      const isUserRecipe = wasRecipe.authorId === userId;
      if (!isUserRecipe) return status(403, {
        error: "не твоё - не трожь! 😡",
      });

      const updated = await tx
        .update(schema.recipes)
        .set(body)
        .where(eq(schema.recipes.id, id));

      if (updated.rowsAffected === 0) return status(404, {
        error: "recipe with this id not found",
      });

      await tx.delete(schema.recipeAllergens).where(eq(schema.recipeAllergens.recipeId, id));
      await tx.insert(schema.recipeAllergens).values(
        body.allergenIds.map((allergenId) => ({
          recipeId: id,
          allergenId,
        }))
      );

      await tx.delete(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, id));
      await tx.insert(schema.recipeIngredients).values(
        body.ingredients.map((ingredient) => ({
          recipeId: id,
          ...ingredient,
        }))
      );

      const recipe = await tx.query.recipes.findFirst({
        ...baseQuery,
        where: eq(schema.recipes.id, id),
      });

      if (!recipe) return tx.rollback();

      return serializeRecipe(recipe);
    });
  }, {
    params: Params,
    body: RecipeCreate,
    response: {
      200: RecipeRead,
      403: Error,
      404: Error,
    },
    auth: true,
  })
  .delete("/:id", async ({ params: { id }, auth: { userId }, status }) => {
    return await db.transaction(async (tx) => {
      const wasRecipe = await tx.query.recipes.findFirst({
        where: eq(schema.recipes.id, id),
      });
      if (!wasRecipe) return status(404, {
        error: "recipe with this id not found",
      });
      const isUserRecipe = wasRecipe.authorId === userId;
      if (!isUserRecipe) return status(403, {
        error: "не твоё - не трожь! 😡",
      });

      await tx
        .delete(schema.recipeAllergens)
        .where(eq(schema.recipeAllergens.recipeId, id));

      await tx
        .delete(schema.recipeIngredients)
        .where(eq(schema.recipeIngredients.recipeId, id));

      await tx
        .delete(schema.recipes)
        .where(eq(schema.recipes.id, id));

      return status(204, {
        message: "success",
      });
    });
  }, {
    params: Params,
    response: {
      204: Message,
      403: Error,
      404: Error,
    },
    auth: true,
  })
