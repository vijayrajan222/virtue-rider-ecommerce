import Category from '../../models/categoryModel.js'
import mongoose from 'mongoose'


    const categoryController ={
    getCategories: async (req, res) => {
        try {
            // Check connection state
            if (mongoose.connection.readyState !== 1) {
                throw new Error('Database connection not ready');
            }

            console.log('Fetching categories...');
            const categories = await Category.find({})
                .sort({ createdAt: -1 })
                .lean();  // Convert to plain JavaScript objects

            // Debug logs
            console.log('Number of categories found:', categories.length);
            console.log('Categories data:', JSON.stringify(categories, null, 2));

            res.render('admin/category', { 
                categories: categories,
                error: null,
                title: 'Category Management'
            });
        } catch (error) {
            console.error('Error in getCategories:', error);
            res.render('admin/category', { 
                categories: [],
                error: 'Failed to fetch categories. Please try again.',
                title: 'Category Management'
            });
        }
    },

    addCategory : async (req, res) => {
        try {
            const { categoryName, categoryDescription } = req.body;
            
            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name and description are required'
                });
            }

            // Check if category already exists (case insensitive)
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category already exists'
                });
            }

            // Create new category with capitalized first letter
            const formattedName = categoryName.trim()
                .toLowerCase()
                .replace(/\b\w/g, char => char.toUpperCase());

            const newCategory = new Category({
                name: formattedName,
                description: categoryDescription.trim(),
                isActive: true
            });

            await newCategory.save();
            
            res.status(200).json({
                success: true,
                message: 'Category added successfully',
                category: newCategory
            });
        } catch (error) {
            console.error('Error adding category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add category'
            });
        }
    },

    createCategory : async (req, res) => {
        try {
            const { name, description } = req.body;

            if (!name.trim() || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name and description are required'
                });
            }

            // Check for existing category (case insensitive)
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category already exists'
                });
            }

            // Format the category name (capitalize first letter of each word)
            const formattedName = name.trim()
                .toLowerCase()
                .replace(/\b\w/g, char => char.toUpperCase());

            const category = new Category({
                name: formattedName,
                description: description.trim()
            });

            await category.save();

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                category
            });
        } catch (error) {
            console.error("Error creating category:", error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category'
            });
        }
    },

    // Edit category
    editCategory : async (req, res) => {
        try {
            const { categoryId, categoryName, categoryDescription } = req.body;

            // Validate inputs
            if (!categoryName.trim() || !categoryDescription.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name and description are required'
                });
            }

            // Check if another category with the same name exists (excluding current category)
            const existingCategory = await Category.findOne({
                _id: { $ne: categoryId },
                name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }

            // Format the category name
            const formattedName = categoryName.trim()
                .toLowerCase()
                .replace(/\b\w/g, char => char.toUpperCase());

            const updatedCategory = await Category.findByIdAndUpdate(
                categoryId,
                {
                    name: formattedName,
                    description: categoryDescription.trim()
                },
                { new: true }
            );

            if (!updatedCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                category: updatedCategory
            });
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category'
            });
        }
    },

    // Toggle category status
    toggleCategory : async (req, res) => {
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
    },

    deleteCategory : async (req, res) => {
        try {
            const { id } = req.params;
            const result = await Category.findByIdAndDelete(id);
            
            if (!result) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.status(200).json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ error: 'Failed to delete category' });
        }
    }
    
};

 // Category Controllers
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/categories', {
            categories,
            path: req.path,
            title: 'Categories'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
}

export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = new Category({
            name,
            description
        });
        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            category
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Optional: Update products that use this category
        await Product.updateMany(
            { categoryId: req.params.id },
            { $unset: { categoryId: 1 } }
        );

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
}


export { categoryController };

