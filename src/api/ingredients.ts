import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq, exists } from "drizzle-orm";

const Id = z.int32().min(0);

const IngredientRead = z.object({
  id: Id,
  name: z.string(),
});

const IngredientCreate = z.object({
  name: z.string(),
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

const Include = z.enum(["cuisine", "ingredients", "allergens"]);
const Select = z.enum(["id", "title", "difficulty", "description", "cookingTime"]);

const IncludeSelect = z.object({
  include: Include.array().or(Include.transform(s => [s])),
  select: Select.array().or(Select.transform(s => [s])),
}).partial();

function buildWith(include?: z.infer<typeof Include>[]) {
  if (!include?.length) return undefined;

  const withObj: Parameters<typeof db.query.recipes.findFirst>[0] = {
    with: {},
  };

  if (include.includes("cuisine")) {
    withObj.with!.cuisine = true;
  }

  if (include.includes("ingredients")) {
    withObj.with!.recipeIngredients = {
      with: { ingredient: true },
    };
  }

  if (include.includes("allergens")) {
    withObj.with!.recipeAllergens = {
      with: { allergen: true },
    };
  }

  return Object.keys(withObj.with!).length ? withObj.with : undefined;
}

const recipeColumns = {
  id: schema.recipes.id,
  title: schema.recipes.title,
  difficulty: schema.recipes.difficulty,
  description: schema.recipes.description,
  cookingTime: schema.recipes.cookingTime,
} as const;

type RecipeField = keyof typeof recipeColumns;

function buildSelect(select?: z.infer<typeof Select>[]) {
  if (!select?.length) return undefined;

  const columnsObj: Parameters<typeof db.query.recipes.findFirst>[0] = {
    columns: {},
  };

  for (const field of select) {
    if (field in recipeColumns) {
      columnsObj.columns![field as RecipeField] = true;
    }
  }

  return Object.keys(columnsObj.columns!).length ? columnsObj.columns : undefined;
}

const RecipeRead = z.object({
  id: Id,
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
  cuisine: z.object({
    id: Id,
    name: z.string(),
  }).optional(),
  allergens: z.object({
    id: Id,
    name: z.string(),
  }).array().optional(),
  ingredients: z.object({
    id: Id,
    quantity: z.int32().min(1),
    measurement: z.enum(schema.MeasurementEnum),
    name: z.string(),
  }).array().optional(),
});

const baseQuery = {
  with: {
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

type OptionalIncludeFields = Pick<Partial<NonNullable<Awaited<ReturnType<typeof db.query.recipes.findFirst<typeof baseQuery>>>>>, "cuisine" | "recipeAllergens" | "recipeIngredients">;
type RecipeSelectWithOptionalFields = NonNullable<Awaited<ReturnType<typeof db.query.recipes.findFirst>>> & OptionalIncludeFields;

function serializeRecipe(recipe: RecipeSelectWithOptionalFields): z.infer<typeof RecipeRead> {
  const { cuisineId, recipeAllergens, recipeIngredients, ...rest } = recipe;

  return {
    ...rest,
    allergens: recipe.recipeAllergens?.map((ra) => ra.allergen),
    ingredients: recipe.recipeIngredients?.map((ri) => ({
      id: ri.ingredient.id,
      quantity: ri.quantity,
      measurement: ri.measurement,
      name: ri.ingredient.name,
    })),
  };
}

export const ingredientsRouter = new Elysia({ prefix: "/ingredients" })
  .get("", async () => {
    const ingredients = await db.query.ingredients.findMany();
    return ingredients;
  }, {
    response: IngredientRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [ingredient] = await db
      .insert(schema.ingredients)
      .values(body)
      .returning();

    return status(201, ingredient);
  }, {
    body: IngredientCreate,
    response: { 201: IngredientRead },
  })
  .get("/:id", async ({ params: { id }, status }) => {
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(schema.ingredients.id, id),
    });
    if (!ingredient) return status(404, {
      error: "ingredient with this id not found",
    });
    return ingredient;
  }, {
    params: Params,
    response: {
      200: IngredientRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    const [ingredient] = await db
      .update(schema.ingredients)
      .set(body)
      .where(eq(schema.ingredients.id, id))
      .returning();

    if (!ingredient) return status(404, {
      error: "ingredient with this id not found",
    });

    return ingredient;
  }, {
    params: Params,
    body: IngredientCreate,
    response: {
      200: IngredientRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    const deleted = await db
      .delete(schema.ingredients)
      .where(eq(schema.ingredients.id, id));

    if (deleted.rowsAffected === 0) return status(404, {
      error: "ingredient with this id not found",
    });

    return status(204, {
      message: "success",
    });
  }, {
    params: Params,
    response: {
      204: Message,
      404: Error,
    },
  })
  .get("/:id/recipes", async ({ params: { id }, query, status }) => {
    const ingredientExists = await db.query.ingredients.findFirst({
      where: eq(schema.ingredients.id, id),
    });

    if (!ingredientExists) return status(404, {
      error: "ingredient with this id not found",
    });

    const withRelations = buildWith(query.include);
    const selectFields = buildSelect(query.select);

    const recipes = await db.query.recipes.findMany({
      where: exists(
        db
          .select()
          .from(schema.recipeIngredients)
          .where(
            and(
              eq(schema.recipeIngredients.recipeId, schema.recipes.id),
              eq(schema.recipeIngredients.ingredientId, id),
            )
          )
      ),
      with: withRelations,
      columns: selectFields,
    });

    return recipes.map(serializeRecipe);
  }, {
    params: Params,
    query: IncludeSelect,
    response: {
      200: RecipeRead.array(),
      404: Error,
    },
  })
