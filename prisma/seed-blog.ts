import { PrismaClient, ArticleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding blog categories and sample article...');

  const categories = await Promise.all([
    prisma.blogCategory.upsert({
      where: { slug: 'legalities' },
      update: {},
      create: {
        name: 'Legalities',
        slug: 'legalities',
        description: 'Legal aspects of cottage ownership and co-ownership',
        color: '#3b82f6',
      },
    }),
    prisma.blogCategory.upsert({
      where: { slug: 'how-tos' },
      update: {},
      create: {
        name: 'How-Tos',
        slug: 'how-tos',
        description: 'Practical guides for cottage management and maintenance',
        color: '#10b981',
      },
    }),
    prisma.blogCategory.upsert({
      where: { slug: 'wills-inheritance' },
      update: {},
      create: {
        name: 'Wills & Inheritance',
        slug: 'wills-inheritance',
        description: 'Estate planning and succession for cottage properties',
        color: '#8b5cf6',
      },
    }),
    prisma.blogCategory.upsert({
      where: { slug: 'family-transitions' },
      update: {},
      create: {
        name: 'Family Transitions',
        slug: 'family-transitions',
        description: 'Managing generational changes in cottage ownership',
        color: '#f59e0b',
      },
    }),
    prisma.blogCategory.upsert({
      where: { slug: 'taxes' },
      update: {},
      create: {
        name: 'Taxes',
        slug: 'taxes',
        description: 'Tax implications and considerations for cottage ownership',
        color: '#ef4444',
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  const article = await prisma.blogArticle.upsert({
    where: { slug: 'understanding-cottage-co-ownership' },
    update: {},
    create: {
      title: 'Understanding Cottage Co-Ownership: A Complete Guide',
      slug: 'understanding-cottage-co-ownership',
      excerpt: 'Learn the essential legal and practical considerations when owning a cottage with family members or friends.',
      content: `# Understanding Cottage Co-Ownership

Owning a cottage with family members or friends can be a rewarding experience, but it requires careful planning and clear agreements to avoid conflicts.

## Legal Structures for Co-Ownership

There are several ways to structure cottage co-ownership:

### Tenants in Common
Each owner holds a specific percentage of the property. Shares can be equal or unequal, and each owner can sell or transfer their share independently.

### Joint Tenancy
All owners have equal shares and the right of survivorship. When one owner passes away, their share automatically transfers to the surviving owners.

### Corporation or Trust
Some families create a corporation or trust to hold the cottage property, which can simplify succession planning and management.

## Key Considerations

### 1. Usage Rules
Establish clear rules about:
- Booking and reservation systems
- Peak season allocation
- Guest policies
- Maintenance responsibilities

### 2. Financial Agreements
Document how you'll handle:
- Property taxes and insurance
- Utility costs
- Repairs and improvements
- Emergency expenses

### 3. Decision-Making Process
Define how major decisions will be made:
- Voting procedures
- Required majority for different decisions
- Dispute resolution mechanisms

## Creating a Co-Ownership Agreement

A well-drafted co-ownership agreement should address:

1. Ownership percentages and contributions
2. Usage schedules and booking procedures
3. Cost-sharing formulas
4. Maintenance and improvement protocols
5. Succession and exit strategies
6. Dispute resolution procedures

## Working with Legal Professionals

Consider consulting with:
- Real estate lawyers familiar with cottage country
- Estate planning attorneys
- Tax professionals
- Insurance advisors

## Next Steps

If you're considering cottage co-ownership:

1. Have open conversations with all potential co-owners
2. Consult legal and financial professionals
3. Draft a comprehensive co-ownership agreement
4. Establish clear communication channels
5. Review and update your agreement regularly

Remember, successful co-ownership is built on clear communication, fair processes, and mutual respect among all owners.`,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
      readingTimeMin: 4,
      categoryId: categories[0].id, // Legalities
    },
  });

  console.log(`Created sample article: ${article.title}`);
  console.log('\nBlog seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding blog:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
