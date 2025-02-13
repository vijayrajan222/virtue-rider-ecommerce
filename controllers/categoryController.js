import Category from '../models/Category.js'

const categoryController = {
    // Render category management page
    getCategories: async (req, res) => {
        try {
            // Add debug logs
            console.log('Fetching categories...');
            const categories = await Category.find({}).sort({ createdAt: -1 });
            console.log('Found categories:', categories); // Check if data is being fetched

            // Check if categories exist
            if (!categories || categories.length === 0) {
                console.log('No categories found in database');
            }

            // Pass the categories to the view
            res.render('admin/category', { 
                categories: categories || [], // Ensure categories is always defined
                error: null,
                success: null 
            });
        } catch (error) {
            console.error('Error in getCategories:', error);
            res.status(500).render('admin/category', { 
                categories: [],
                error: 'Failed to fetch categories',
                success: null 
            });
        }
    },

    addCategory: async (req, res) => {
        try {
            const { categoryName, categoryDescription } = req.body;
            
            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).send('Category name and description are required');
            }

            // Check if category already exists
            const existingCategory = await Category.findOne({ name: categoryName });
            if (existingCategory) {
                return res.status(400).send('Category already exists');
            }

            // Create new category
            const newCategory = new Category({
                name: categoryName,
                description: categoryDescription,
                isActive: true
            });

            await newCategory.save();
            res.status(200).send('Category added successfully');
        } catch (error) {
            res.status(500).send('Failed to add category');
        }
    },

    // Edit category
    editCategory: async (req, res) => {
        try {
            const { categoryId, categoryName, categoryDescription } = req.body;

            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).send('Category name and description are required');
            }

            const updatedCategory = await Category.findByIdAndUpdate(
                categoryId,
                {
                    name: categoryName,
                    description: categoryDescription
                },
                { new: true }
            );

            if (!updatedCategory) {
                return res.status(404).send('Category not found');
            }

            res.status(200).send('Category updated successfully');
        } catch (error) {
            res.status(500).send('Failed to update category');
        }
    },

    // Toggle category status
    toggleCategory: async (req, res) => {
        try {
            const { id } = req.query;
            const category = await Category.findById(id);
            
            if (!category) {
                return res.status(404).send('Category not found');
            }

            category.isActive = !category.isActive;
            await category.save();

            res.status(200).send('Category status updated successfully');
        } catch (error) {
            res.status(500).send('Failed to toggle category status');
        }
    }
};

export { categoryController };

