import { faker, fakerRU } from "@faker-js/faker";
import { db, schema } from ".";
import argon2 from "argon2";

const createFakeUser = async (): Promise<typeof schema.users.$inferInsert> => ({
  login: faker.internet.username(),
  passwordHash: await argon2.hash("1"),
  firstName: fakerRU.person.firstName(),
  lastName: fakerRU.person.lastName()
});

const createFakeRecipe = (cuisineId: number, authorId: number): typeof schema.recipes.$inferInsert => ({
  title: fakerRU.food.dish(),
  description: fakerRU.food.adjective(),
  cookingTime: faker.number.int({ min: 1, max: 100 }),
  difficulty: faker.number.int({ min: 1, max: 5 }),
  cuisineId,
  authorId,
});

const createFakePost = (): typeof schema.posts.$inferInsert => ({
  title: fakerRU.book.title(),
  descr: fakerRU.book.genre(),
});

const createAmount = <T>(createFn: () => T, amount: number) => {
  const result: T[] = [];
  while (result.length < amount) {
    result.push(createFn());
  }
  return result;
}

const createAmountAsync = async <T>(createFn: () => Promise<T>, amount: number) => {
  const result: T[] = [];
  while (result.length < amount) {
    result.push(await createFn());
  }
  return result;
}

await db.delete(schema.recipeAllergens);
await db.delete(schema.recipeIngredients);
await db.delete(schema.recipes);
await db.delete(schema.users);
await db.delete(schema.cuisines);
await db.delete(schema.allergens);
await db.delete(schema.ingredients);
await db.delete(schema.posts);
console.log("deleted the whole database");

const cuisines = await db.insert(schema.cuisines).values(
  faker.helpers.uniqueArray(
    fakerRU.food.ethnicCategory, 100
  ).map((name) => ({ name }))
).returning();
console.log("seeded cuisines");

const allergens = await db.insert(schema.allergens).values(
  faker.helpers.uniqueArray(
    fakerRU.food.spice, 100
  ).map((name) => ({ name }))
).returning();
console.log("seeded allergens");

const ingredients = await db.insert(schema.ingredients).values(
  faker.helpers.uniqueArray(
    fakerRU.food.ingredient, 100
  ).map((name) => ({ name }))
).returning();
console.log("seeded ingredients");

const users = await db.insert(schema.users).values(
  await createAmountAsync(createFakeUser, 100)
).returning();
console.log("seeded users");

const recipes = await db.insert(schema.recipes).values(
  cuisines.flatMap((cuisine) =>
    createAmount(() => createFakeRecipe(
      cuisine.id,
      faker.helpers.arrayElement(users).id,
    ), 3)
  )
).returning();
console.log("seeded recipes");

await db.insert(schema.recipeAllergens).values(
  faker.helpers.arrayElements(recipes)
    .flatMap(({ id: recipeId }) => faker.helpers.arrayElements(allergens, {
      min: 1,
      max: 5,
    }).map(({ id: allergenId }) => ({ recipeId, allergenId })))
);
console.log("seeded recipe allergens");

await db.insert(schema.recipeIngredients).values(
  recipes.flatMap(({ id: recipeId }) => faker.helpers.arrayElements(ingredients, {
    min: 3,
    max: 10,
  }).map(({ id: ingredientId }) => ({
    recipeId,
    ingredientId,
    quantity: faker.number.int({ min: 1, max: 20 }),
    measurement: faker.helpers.enumValue(schema.MeasurementEnum),
  })))
);
console.log("seeded recipe ingredients");

await db.insert(schema.posts).values(
  createAmount(createFakePost, 100)
);
console.log("seeded posts");
